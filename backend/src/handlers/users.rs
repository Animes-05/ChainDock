use axum::{extract::State, routing::get, Json, Router};

use crate::{error::AppError, extractors::AuthenticatedUser, models::UserPublic, AppState};

pub fn router() -> Router<AppState> {
    Router::new().route("/users/me", get(me))
}
async fn me(
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Json<UserPublic>, AppError> {
    let profile = sqlx::query_as!(
        UserProfileRow,
        r#"SELECT id, email, role as "role: crate::models::Role" FROM users WHERE id = $1"#,
        user.user_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(UserPublic {
        id: profile.id,
        email: profile.email,
        role: profile.role,
    }))
}

struct UserProfileRow {
    id: uuid::Uuid,
    email: String,
    role: crate::models::Role,
}
