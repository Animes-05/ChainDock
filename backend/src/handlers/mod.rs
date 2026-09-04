// pub mod auth;   // Dev A — next up: login, JWT issue/refresh
// pub mod cases;  // Dev A
// pub mod documents;  // Dev B
// pub mod audit;      // Dev B
// pub mod signatures; // Dev B

use axum::{routing::get, Json, Router};
use serde_json::{json, Value};

use crate::AppState;

/// Temporary root router — just a health check so we can confirm the server boots
/// and the DB pool connects before wiring real auth routes on top.
pub fn router() -> Router<AppState> {
    Router::new().route("/health", get(health))
}

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}
