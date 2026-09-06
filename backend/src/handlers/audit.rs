use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Serialize;
use sha2::{Digest, Sha256};
use sqlx::{Postgres, Transaction};
use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::{require_role, AuthenticatedUser},
    models::Role,
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/audit/verify-chain", get(verify_chain))
        .route("/cases/:id/audit-trail", get(audit_trail))
}

/// Genesis hash for the first row in the chain — 64 zero chars, same length as a
/// real sha256 hex digest so nothing downstream needs a special case for "no prior row".
fn genesis_hash() -> String {
    "0".repeat(64)
}

fn compute_entry_hash(
    prev_hash: &str,
    actor_id: Uuid,
    action: &str,
    document_id: Option<Uuid>,
    case_id: Option<Uuid>,
    created_at: DateTime<Utc>,
) -> String {
    let mut hasher = Sha256::new();
    hasher.update(prev_hash.as_bytes());
    hasher.update(actor_id.to_string().as_bytes());
    hasher.update(action.as_bytes());
    hasher.update(document_id.map(|d| d.to_string()).unwrap_or_default().as_bytes());
    hasher.update(case_id.map(|c| c.to_string()).unwrap_or_default().as_bytes());
    hasher.update(created_at.to_rfc3339().as_bytes());
    hex::encode(hasher.finalize())
}

/// Appends one row to the hash chain, inside the caller's transaction — every mutating
/// endpoint calls this as the last step before `tx.commit()`, so the write it's logging
/// and the audit row either both land or both roll back together.
///
/// `pg_advisory_xact_lock` serializes concurrent callers for the lifetime of the
/// transaction: without it, two simultaneous requests could both read the same "last
/// hash" and each append a row pointing at it, forking the chain.
pub async fn append_entry(
    tx: &mut Transaction<'_, Postgres>,
    actor_id: Uuid,
    action: &str,
    document_id: Option<Uuid>,
    case_id: Option<Uuid>,
) -> Result<(), AppError> {
    sqlx::query!("SELECT pg_advisory_xact_lock(hashtext('audit_log'))")
        .execute(&mut **tx)
        .await?;

    let last_hash: Option<String> =
        sqlx::query_scalar!("SELECT entry_hash FROM audit_log ORDER BY seq DESC LIMIT 1")
            .fetch_optional(&mut **tx)
            .await?;

    let prev_hash = last_hash.unwrap_or_else(genesis_hash);
    let created_at = Utc::now();
    let entry_hash = compute_entry_hash(&prev_hash, actor_id, action, document_id, case_id, created_at);

    sqlx::query!(
        r#"
        INSERT INTO audit_log (prev_hash, entry_hash, actor_id, action, document_id, case_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
        prev_hash,
        entry_hash,
        actor_id,
        action,
        document_id,
        case_id,
        created_at
    )
    .execute(&mut **tx)
    .await?;

    Ok(())
}

struct AuditRow {
    seq: i64,
    id: Uuid,
    prev_hash: String,
    entry_hash: String,
    actor_id: Uuid,
    action: String,
    document_id: Option<Uuid>,
    case_id: Option<Uuid>,
    created_at: DateTime<Utc>,
}

#[derive(Serialize)]
struct VerifyChainResponse {
    valid: bool,
    total_entries: i64,
    broken_at_seq: Option<i64>,
    broken_at_id: Option<Uuid>,
}

/// Admin only. Walks the whole chain in `seq` order, recomputes each entry_hash from
/// its own stored fields, and checks two things per row:
///   1. the recomputed hash matches the row's stored `entry_hash` (row content intact)
///   2. the row's stored `prev_hash` matches the previous row's `entry_hash` (link intact)
/// The first row to fail either check is the tamper point — everything from there on
/// is unverifiable, which is exactly the "aha" moment the demo needs.
async fn verify_chain(
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Json<VerifyChainResponse>, AppError> {
    require_role(&user, &[Role::Admin])?;

    let rows = sqlx::query_as!(
        AuditRow,
        r#"SELECT seq, id, prev_hash, entry_hash, actor_id, action, document_id, case_id, created_at
           FROM audit_log ORDER BY seq ASC"#
    )
    .fetch_all(&state.db)
    .await?;

    let mut expected_prev = genesis_hash();

    for row in &rows {
        if row.prev_hash != expected_prev {
            return Ok(Json(VerifyChainResponse {
                valid: false,
                total_entries: rows.len() as i64,
                broken_at_seq: Some(row.seq),
                broken_at_id: Some(row.id),
            }));
        }

        let recomputed = compute_entry_hash(
            &row.prev_hash,
            row.actor_id,
            &row.action,
            row.document_id,
            row.case_id,
            row.created_at,
        );

        if recomputed != row.entry_hash {
            return Ok(Json(VerifyChainResponse {
                valid: false,
                total_entries: rows.len() as i64,
                broken_at_seq: Some(row.seq),
                broken_at_id: Some(row.id),
            }));
        }

        expected_prev = row.entry_hash.clone();
    }

    Ok(Json(VerifyChainResponse {
        valid: true,
        total_entries: rows.len() as i64,
        broken_at_seq: None,
        broken_at_id: None,
    }))
}

#[derive(Serialize)]
struct AuditTrailEntry {
    id: Uuid,
    actor_id: Uuid,
    actor_email: String,
    action: String,
    document_id: Option<Uuid>,
    created_at: DateTime<Utc>,
}

/// Supervisor/admin only, per DESIGN.md. Chronological trail for one case — joins to
/// `users` for a readable actor email instead of a bare UUID in the frontend table.
async fn audit_trail(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(case_id): Path<Uuid>,
) -> Result<Json<Vec<AuditTrailEntry>>, AppError> {
    require_role(&user, &[Role::Supervisor, Role::Admin])?;

    let rows = sqlx::query!(
        r#"
        SELECT a.id, a.actor_id, u.email as actor_email, a.action, a.document_id, a.created_at
        FROM audit_log a
        JOIN users u ON u.id = a.actor_id
        WHERE a.case_id = $1
        ORDER BY a.seq ASC
        "#,
        case_id
    )
    .fetch_all(&state.db)
    .await?
    .into_iter()
    .map(|r| AuditTrailEntry {
        id: r.id,
        actor_id: r.actor_id,
        actor_email: r.actor_email,
        action: r.action,
        document_id: r.document_id,
        created_at: r.created_at,
    })
    .collect();

    Ok(Json(rows))
}
