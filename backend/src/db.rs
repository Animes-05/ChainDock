use sqlx::postgres::{PgPool, PgPoolOptions};

/// Single shared pool, created once at startup and cloned (cheaply, it's an Arc internally)
/// into AppState. Every handler pulls a connection from this.
pub async fn init_pool(database_url: &str) -> PgPool {
    PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await
        .expect("failed to connect to Postgres — is DATABASE_URL correct and the DB reachable?")
}
