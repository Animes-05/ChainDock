# ChainDock Backend (Axum) — Railway
FROM rust:1.82-slim AS build
WORKDIR /app/backend
# Offline sqlx: query! macros resolve from committed .sqlx/ so the
# Railway build needs no live DATABASE_URL.
ENV SQLX_OFFLINE=true
COPY Cargo.toml Cargo.lock ./
COPY .sqlx ./.sqlx
# Cache deps: dummy build then real copy (migrations + src change often).
RUN mkdir -p src && echo 'fn main() {}' > src/main.rs && cargo build --release || true
COPY src ./src
COPY migrations ./migrations
RUN cargo build --release

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/backend/target/release/backend ./backend
COPY --from=build /app/backend/migrations ./migrations
# Railway injects PORT + DATABASE_URL. LEDGER_SERVICE_URL points at the
# ledger-service Railway service (private network preferred).
ENV PORT=3000
EXPOSE 3000
CMD ["./backend"]
