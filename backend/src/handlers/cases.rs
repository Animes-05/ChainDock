use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::{require_role, AuthenticatedUser},
    handlers::audit,
    models::Role,
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/cases", post(create_case).get(list_cases))
        .route("/cases/{id}/assign", post(assign_user))
}

#[derive(Deserialize)]
struct CreateCaseRequest {
    title: String,
    case_number: String,
}

#[derive(Serialize)]
struct CaseResponse {
    id: Uuid,
    title: String,
    case_number: String,
    created_by: Uuid,
}

/// Supervisor/admin only. The creator is auto-assigned to their own case — otherwise
/// a supervisor who creates a case couldn't see it under the access-scoping model.
/// Writes a CREATE_CASE audit row in the same transaction as the insert + assignment.
async fn create_case(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Json(body): Json<CreateCaseRequest>,
) -> Result<Json<CaseResponse>, AppError> {

    require_role(&user, &[Role::Supervisor, Role::Admin])?;

    if body.title.trim().is_empty() || body.case_number.trim().is_empty() {
        return Err(AppError::BadRequest("title and case_number are required".into()));
    }

    let mut tx = state.db.begin().await?;

    let case_id = Uuid::new_v4();
    sqlx::query!(
        "INSERT INTO cases (id, title, case_number, created_by) VALUES ($1, $2, $3, $4)",
        case_id,
        body.title,
        body.case_number,
        user.user_id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
            AppError::BadRequest("a case with that case_number already exists".into())
        }
        other => AppError::Database(other),
    })?;

    sqlx::query!(
        "INSERT INTO case_assignments (case_id, user_id) VALUES ($1, $2)",
        case_id,
        user.user_id
    )
    .execute(&mut *tx)
    .await?;

    audit::append_entry(&mut tx, user.user_id, "CREATE_CASE", None, Some(case_id)).await?;

    tx.commit().await?;

    Ok(Json(CaseResponse {
        id: case_id,
        title: body.title,
        case_number: body.case_number,
        created_by: user.user_id,
    }))
}

/// Investigators see only cases they're assigned to. Supervisors/admin see everything —
/// simplest correct behavior per PRD.md role table, no extra flag needed.
async fn list_cases(
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Json<Vec<CaseResponse>>, AppError> {
    let rows = if matches!(user.role, Role::Supervisor | Role::Admin) {
        sqlx::query!(
            r#"SELECT id, title, case_number, created_by FROM cases ORDER BY created_at DESC"#
        )
        .fetch_all(&state.db)
        .await?
        .into_iter()
        .map(|r| CaseResponse {
            id: r.id,
            title: r.title,
            case_number: r.case_number,
            created_by: r.created_by,
        })
        .collect()
    } else {
        sqlx::query!(
            r#"
            SELECT c.id, c.title, c.case_number, c.created_by
            FROM cases c
            JOIN case_assignments ca ON ca.case_id = c.id
            WHERE ca.user_id = $1
            ORDER BY c.created_at DESC
            "#,
            user.user_id
        )
        .fetch_all(&state.db)
        .await?
        .into_iter()
        .map(|r| CaseResponse {
            id: r.id,
            title: r.title,
            case_number: r.case_number,
            created_by: r.created_by,
        })
        .collect()
    };

    Ok(Json(rows))
}




#[derive(Deserialize)]
struct AssignRequest {
    user_id: Uuid,
}

/// Supervisor/admin only. Idempotent-ish: a duplicate assignment is a client error,
/// not a silent no-op — keeps intent explicit for the audit trail. Writes an
/// ASSIGN_USER audit row in the same transaction as the assignment insert.
async fn assign_user(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(case_id): Path<Uuid>,
    Json(body): Json<AssignRequest>,
) -> Result<Json<serde_json::Value>, AppError> {

    require_role(&user, &[Role::Supervisor, Role::Admin])?;

    let case_exists = sqlx::query_scalar!("SELECT id FROM cases WHERE id = $1", case_id)
        .fetch_optional(&state.db)
        .await?;
    if case_exists.is_none() {
        return Err(AppError::NotFound);
    }

    let mut tx = state.db.begin().await?;

    sqlx::query!(
        "INSERT INTO case_assignments (case_id, user_id) VALUES ($1, $2)",
        case_id,
        body.user_id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
            AppError::BadRequest("user is already assigned to this case".into())
        }
        sqlx::Error::Database(db_err) if db_err.is_foreign_key_violation() => {
            AppError::BadRequest("user_id does not exist".into())
        }
        other => AppError::Database(other),
    })?;

    audit::append_entry(&mut tx, user.user_id, "ASSIGN_USER", None, Some(case_id)).await?;

    tx.commit().await?;

    Ok(Json(serde_json::json!({ "status": "assigned" })))
}
