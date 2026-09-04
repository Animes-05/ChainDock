use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;


#[derive(thiserror::Error, Debug)]
pub enum AppError {
    #[error("invalid credentials")]
    InvalidCredentials,

    #[error("unauthorized")]
    Unauthorized,

    #[error("forbidden")]
    Forbidden,

    #[error("not found")]
    NotFound,

    #[error("database error")]
    Database(#[from] sqlx::Error),

    #[error("password hashing error")]
    Hash(#[from] bcrypt::BcryptError),

    #[error("token error")]
    Token(#[from] jsonwebtoken::errors::Error),

    #[error("bad request: {0}")]
    BadRequest(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        // Log the real error server-side always; only return a safe message to the client.
        // Never leak sqlx/bcrypt/jwt internals — that's an easy accidental info-leak for a
        // system whose whole pitch is "we take security seriously".
        tracing::error!(error = %self, "request failed");

        let (status, message) = match self {
            AppError::InvalidCredentials => (StatusCode::UNAUTHORIZED, "invalid credentials"),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized"),
            AppError::Forbidden => (StatusCode::FORBIDDEN, "forbidden"),
            AppError::NotFound => (StatusCode::NOT_FOUND, "not found"),
            AppError::BadRequest(_) => (StatusCode::BAD_REQUEST, "bad request"),
            AppError::Database(_) | AppError::Hash(_) | AppError::Token(_) => {
                (StatusCode::INTERNAL_SERVER_ERROR, "internal server error")
            }
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}
