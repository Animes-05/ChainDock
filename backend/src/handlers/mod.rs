pub mod auth;   // Dev A — register, login, JWT issue/refresh
pub mod users;  // Dev A — user profile (GET /users/me)
// pub mod cases;  // Dev A — next
// pub mod documents;  // Dev B
// pub mod audit;      // Dev B
// pub mod signatures; // Dev B

use axum::{routing::get, Json, Router};
use serde_json::{json, Value};

use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health))
        .merge(auth::router())
        .merge(users::router())
}

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}
