mod config;
mod db;
mod error;
mod handlers;
// mod extractors; // AuthenticatedUser extractor — added alongside auth.rs

use axum::Router;
use sqlx::PgPool;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use config::Config;


#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Config,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend=debug,tower_http=debug".into()),
        )
        .init();

    let config = Config::from_env();
    let db = db::init_pool(&config.database_url).await;

    sqlx::migrate!("./migrations")
        .run(&db)
        .await
        .expect("failed to run migrations");

    let port = config.port;
    let state = AppState { db, config };

    let app = Router::new()
        .merge(handlers::router())
        .layer(CorsLayer::permissive()) // fine for hackathon MVP; tighten if time allows
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .expect("failed to bind port");

    tracing::info!("backend gateway running on http://127.0.0.1:{port}");
    axum::serve(listener, app).await.expect("server error");
}
