pub mod auth;
pub mod users;


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
