use axum::{extract::State, routing::post, Json, Router};
use chrono::{Duration, Utc};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::{require_role, AuthenticatedUser},
    jwt,
    models::{Role, User, UserPublic},
    AppState,
};

// Refresh tokens live 30 days. Rotated on every use (old one revoked, new one issued),
// so reuse of a stolen token after rotation is visible as a revoked-token lookup.
 
const REFRESH_TOKEN_TTL_DAYS: i64 = 30;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/refresh", post(refresh))
}

#[derive(Deserialize)]
struct RegisterRequest {
    email: String,
    password: String,
    role: Role,
}

// Bootstrap rule: if the `users` table is empty, this is open (so the very first
// admin can be created with no chicken-and-egg auth problem). Once at least one
// user exists, every call must be an authenticated Admin.

async fn register(
    State(state): State<AppState>,
    caller: Option<AuthenticatedUser>,
    Json(body): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    
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

    let access_token = jwt::issue_access_token(id, body.role, &state.config.jwt_secret)?;
    let refresh_token = issue_refresh_token(&state, id).await?;

    Ok(Json(AuthResponse {
        access_token,
        refresh_token,
        user: UserPublic {
            id,
            email: body.email,
            role: body.role,
        },
    }))
}

#[derive(Deserialize)]
struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Serialize)]
struct AuthResponse {
    access_token: String,
    refresh_token: String,
    user: UserPublic,
}

async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, role FROM users WHERE email = $1",
    )
    .bind(&body.email)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::InvalidCredentials)?;

    let valid = bcrypt::verify(&body.password, &user.password_hash)?;
    if !valid {
        return Err(AppError::InvalidCredentials);
    }

    let access_token = jwt::issue_access_token(user.id, user.role, &state.config.jwt_secret)?;
    let refresh_token = issue_refresh_token(&state, user.id).await?;

    Ok(Json(AuthResponse {
        access_token,
        refresh_token,
        user: user.into(),
    }))
}

#[derive(Deserialize)]
struct RefreshRequest {
    refresh_token: String,
}

async fn refresh(
    State(state): State<AppState>,
    Json(body): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let incoming_hash = hash_token(&body.refresh_token);

    // Row must exist, be unexpired, and not already revoked.
    let row = sqlx::query!(
        r#"
        SELECT rt.id as "id!", rt.user_id as "user_id!", u.email, u.password_hash, u.role as "role: crate::models::Role"
        FROM refresh_tokens rt
        JOIN users u ON u.id = rt.user_id
        WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > now()
        "#,
        incoming_hash
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::Unauthorized)?;

    // Rotate: revoke the used token, issue a fresh pair.
    sqlx::query!("UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1", row.id)
        .execute(&state.db)
        .await?;

    let access_token = jwt::issue_access_token(row.user_id, row.role, &state.config.jwt_secret)?;
    let refresh_token = issue_refresh_token(&state, row.user_id).await?;

    Ok(Json(AuthResponse {
        access_token,
        refresh_token,
        user: UserPublic {
            id: row.user_id,
            email: row.email,
            role: row.role,
        },
    }))
}

/// Generates a random 32-byte token, stores its SHA-256 hash in the DB, returns the
/// plaintext to hand to the client. The plaintext is never stored — only the hash,
/// mirroring how passwords are handled.
/// 
async fn issue_refresh_token(state: &AppState, user_id: uuid::Uuid) -> Result<String, AppError> {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    let plaintext = hex::encode(bytes);
    let token_hash = hash_token(&plaintext);
    let expires_at = Utc::now() + Duration::days(REFRESH_TOKEN_TTL_DAYS);

    sqlx::query!(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        user_id,
        token_hash,
        expires_at
    )
    .execute(&state.db)
    .await?;

    Ok(plaintext)
}

fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}
