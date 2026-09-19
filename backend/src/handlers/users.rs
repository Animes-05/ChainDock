use axum::{
    extract::{Path, State},
    routing::{get, patch},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::{require_role, AuthenticatedUser},
    models::{Role, UserPublic, UserStatus},
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/users/me", get(me))
        .route("/users", get(list_users))
        .route("/users/:id", patch(update_user))
}
async fn me(
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Json<UserPublic>, AppError> {
    let profile = sqlx::query_as!(
        UserProfileRow,
        r#"SELECT id, email, role as "role: crate::models::Role", status as "status: crate::models::UserStatus" FROM users WHERE id = $1"#,
        user.user_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(UserPublic {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        status: profile.status,
    }))
}

/// Supervisor/admin — matches who's allowed to call POST /cases/:id/assign, since this
/// is how they look up a user_id to assign in the first place.
async fn list_users(
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Json<Vec<UserPublic>>, AppError> {
    
    require_role(&user, &[Role::Supervisor, Role::Admin])?;

    let rows = sqlx::query_as!(
        UserProfileRow,
        r#"SELECT id, email, role as "role: crate::models::Role", status as "status: crate::models::UserStatus" FROM users ORDER BY email"#
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(
        rows.into_iter()
            .map(|r| UserPublic {
                id: r.id,
                email: r.email,
                role: r.role,
                status: r.status,
            })
            .collect(),
    ))
}

struct UserProfileRow {
    id: uuid::Uuid,
    email: String,
    role: crate::models::Role,
    status: crate::models::UserStatus,
}

/// Suspend, don't delete: users are FK-referenced by cases/documents/audit_log
/// without ON DELETE CASCADE, so hard-delete would break history. Admin-only.
/// Rejects self-suspend so the last active admin can't lock everyone out.
#[derive(Deserialize)]
struct UpdateUserRequest {
    email: Option<String>,
    role: Option<Role>,
    status: Option<UserStatus>,
}

async fn update_user(
    State(state): State<AppState>,
    caller: AuthenticatedUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateUserRequest>,
) -> Result<Json<UserPublic>, AppError> {
    require_role(&caller, &[Role::Admin])?;

    if body.email.is_none() && body.role.is_none() && body.status.is_none() {
        return Err(AppError::BadRequest("nothing to update".into()));
    }

    if let Some(ref email) = body.email {
        if email.trim().is_empty() || !email.contains('@') {
            return Err(AppError::BadRequest("invalid email".into()));
        }
    }

    // No self-suspend / self-demote: an admin acting on their own account may
    // change email only.
    if id == caller.user_id && (body.status.is_some() || body.role.is_some()) {
        return Err(AppError::BadRequest(
            "cannot change your own role or status".into(),
        ));
    }

    let row = sqlx::query_as!(
        UserProfileRow,
        r#"SELECT id, email, role as "role: crate::models::Role", status as "status: crate::models::UserStatus" FROM users WHERE id = $1"#,
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    let new_email = body.email.unwrap_or(row.email);
    let new_role = body.role.unwrap_or(row.role);
    let new_status = body.status.unwrap_or(row.status);

    // Don't strand the system: refuse to suspend/demote the last active admin.
    if row.role == Role::Admin
        && row.status == UserStatus::Active
        && (new_status == UserStatus::Suspended || new_role != Role::Admin)
    {
        let remaining: i64 = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active' AND id != $1"#,
            id
        )
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0);
        if remaining == 0 {
            return Err(AppError::BadRequest(
                "cannot suspend or demote the last active admin".into(),
            ));
        }
    }

    let updated = sqlx::query_as!(
        UserProfileRow,
        r#"UPDATE users SET email = $2, role = $3::user_role, status = $4::user_status WHERE id = $1
           RETURNING id, email, role as "role: crate::models::Role", status as "status: crate::models::UserStatus""#,
        id,
        new_email,
        new_role as Role,
        new_status as UserStatus,
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
            AppError::BadRequest("a user with that email already exists".into())
        }
        other => AppError::Database(other),
    })?;

    // Revoke sessions on suspend so a suspended officer can't keep using an
    // existing JWT/refresh token until expiry.
    if new_status == UserStatus::Suspended {
        sqlx::query!("DELETE FROM refresh_tokens WHERE user_id = $1", id)
            .execute(&state.db)
            .await?;
    }

    tracing::info!(user_id = %id, admin_id = %caller.user_id, "user updated via PATCH /users/:id");

    Ok(Json(UserPublic {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        status: updated.status,
    }))
}
