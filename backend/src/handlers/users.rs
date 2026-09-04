use axum::{extract::State, routing::post, Json, Router};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::{require_role, AuthenticatedUser},
    models::{Role, UserPublic},
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/users", post(create_user))
}

#[derive(Deserialize)]
struct CreateUserRequest {
    email: String,
    password: String,
    role: Role,
}

/// Bootstrap rule: if the `users` table is empty, this endpoint is open (so the very
/// first admin can be created with no chicken-and-egg auth problem). Once at least one
/// user exists, every call must be an authenticated Admin. `caller` is optional on
/// purpose — Option<AuthenticatedUser> resolves to None instead of rejecting when no/bad
/// token is present, so we can check the bootstrap condition before deciding whether
/// that mattered.
async fn create_user(
    State(state): State<AppState>,
    caller: Option<AuthenticatedUser>,
    Json(body): Json<CreateUserRequest>,
) -> Result<Json<UserPublic>, AppError> {
    let user_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(&state.db)
        .await?;

    if user_count > 0 {
        let caller = caller.ok_or(AppError::Unauthorized)?;
        require_role(&caller, &[Role::Admin])?;
    }
    // else: table is empty, bootstrap mode, no auth required — first call wins.

    if body.password.len() < 8 {
        return Err(AppError::BadRequest("password must be at least 8 characters".into()));
    }

    let password_hash = bcrypt::hash(&body.password, bcrypt::DEFAULT_COST)?;
    let id = Uuid::new_v4();

    sqlx::query!(
        "INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4::user_role)",
        id,
        body.email,
        password_hash,
        body.role as Role
    )
    .execute(&state.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
            AppError::BadRequest("a user with that email already exists".into())
        }
        other => AppError::Database(other),
    })?;

    Ok(Json(UserPublic {
        id,
        email: body.email,
        role: body.role,
    }))
}