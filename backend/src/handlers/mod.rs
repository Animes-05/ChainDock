pub mod auth;   // Dev A — register, login, JWT issue/refresh
pub mod users;  // Dev A — user profile (GET /users/me)
pub mod cases;  // Dev A — case creation, listing, assignment
pub mod documents; // Dev B — upload, metadata, search, download
pub mod audit;      // Dev B — hash-chain append helper, verify-chain, audit-trail
// pub mod signatures; // Dev B

use axum::{routing::get, Json, Router};
use serde_json::{json, Value};

use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health))
        .merge(auth::router())
        .merge(users::router())
        .merge(cases::router())
        .merge(documents::router())
        .merge(audit::router())
}

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}
