use std::env;

/// All runtime config in one place. Loaded once at startup, cloned into AppState.
/// No dynamic reloading, no config crate abstraction — a hackathon build doesn't need it.
#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub port: u16,
}

impl Config {
    pub fn from_env() -> Self {
        // Loads .env in dev; in prod (Railway) real env vars are already set, so
        // a missing .env file here is not an error.
        dotenvy::dotenv().ok();

        let database_url = env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set (see .env.example)");
        let jwt_secret = env::var("JWT_SECRET")
            .expect("JWT_SECRET must be set (see .env.example)");
        let port = env::var("PORT")
            .unwrap_or_else(|_| "3000".to_string())
            .parse()
            .expect("PORT must be a valid u16");

        Self {
            database_url,
            jwt_secret,
            port,
        }
    }
}
