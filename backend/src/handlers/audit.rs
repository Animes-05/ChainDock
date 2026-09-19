use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{Postgres, Transaction};
use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::{require_role, AuthenticatedUser},
    ledger_client,
    models::Role,
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/audit/verify-chain", get(verify_chain))
        .route("/cases/:id/audit-trail", get(audit_trail))
        // DEMO ONLY — pitch-day tamper injection, admin-gated. Remove or gate
        // before any real deployment; see ledger_client::demo_tamper_ledger.
        .route("/audit/demo/tamper", post(demo_tamper))
        .route("/audit/demo/restore", post(demo_restore))
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
    broken_at_id: Option<String>,
}

/// Admin only. Ledger-first: proxies to GET /ledger/verify (Fabric integrity
/// state) and translates to the stable frontend shape. Falls back to the
/// Postgres mirror walk when the ledger is unreachable (P0 demo-safety).
async fn verify_chain(
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Json<VerifyChainResponse>, AppError> {
    require_role(&user, &[Role::Admin])?;

    match ledger_client::verify_ledger(&state.config.ledger_service_url).await {
        Ok(v) => Ok(Json(VerifyChainResponse {
            valid: v.valid,
            total_entries: v.total_entries,
            broken_at_seq: None,
            broken_at_id: v.broken_at_id,
        })),
        Err(e) => {
            tracing::warn!(error = %e, "ledger verify unreachable, falling back to Postgres mirror");
            verify_postgres_chain(&state).await.map(Json)
        }
    }
}

async fn verify_postgres_chain(state: &AppState) -> Result<VerifyChainResponse, AppError> {
    // Postgres mirror walk: recompute each entry_hash, check link integrity.
    // First failing row is the tamper point.
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
            return Ok(VerifyChainResponse {
                valid: false,
                total_entries: rows.len() as i64,
                broken_at_seq: Some(row.seq),
                broken_at_id: Some(row.id.to_string()),
            });
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
            return Ok(VerifyChainResponse {
                valid: false,
                total_entries: rows.len() as i64,
                broken_at_seq: Some(row.seq),
                broken_at_id: Some(row.id.to_string()),
            });
        }

        expected_prev = row.entry_hash.clone();
    }

    Ok(VerifyChainResponse {
        valid: true,
        total_entries: rows.len() as i64,
        broken_at_seq: None,
        broken_at_id: None,
    })
}

#[derive(Serialize)]
struct AuditTrailEntry {
    // String (not Uuid): Fabric entryIds are txIDs, and actorIds may be
    // non-UUID strings. UUIDs from Postgres serialize identically as strings,
    // so the frontend `String(e?.id)` normalization keeps working.
    id: String,
    actor_id: String,
    actor_email: String,
    action: String,
    document_id: Option<String>,
    created_at: DateTime<Utc>,
}

/// Same access model as documents.rs::assert_case_access: supervisor/admin see every
/// case's trail; an investigator only sees the trail for a case they're assigned to
/// via case_assignments. This mirrors who can *see* a case at all in GET /cases —
/// an investigator viewing their own case's audit trail is not a privilege escalation,
/// it's the same data they already have access to via the case detail view.
async fn assert_case_access(
    state: &AppState,
    user: &AuthenticatedUser,
    case_id: Uuid,
) -> Result<(), AppError> {
    if matches!(user.role, Role::Supervisor | Role::Admin) {
        return Ok(());
    }

    let assigned = sqlx::query_scalar!(
        "SELECT 1 FROM case_assignments WHERE case_id = $1 AND user_id = $2",
        case_id,
        user.user_id
    )
    .fetch_optional(&state.db)
    .await?;

    if assigned.is_some() {
        Ok(())
    } else {
        Err(AppError::Forbidden)
    }
}

/// Open to all three roles, but scoped: investigators only get the trail for cases
/// they're assigned to (assert_case_access); supervisor/admin get any case's trail.
/// Ledger-first proxy to GET /ledger/cases/:id/trail, with Postgres mirror
/// fallback when the ledger is unreachable.
async fn audit_trail(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(case_id): Path<Uuid>,
) -> Result<Json<Vec<AuditTrailEntry>>, AppError> {
    assert_case_access(&state, &user, case_id).await?;

    match ledger_client::get_ledger_trail(&state.config.ledger_service_url, case_id).await {
        Ok(entries) => {
            let mut out = Vec::with_capacity(entries.len());
            for e in entries {
                // Resolve actor email when actor_id is a local user UUID;
                // otherwise display the raw actor string (e.g. mock/demo ids).
                let (actor_id, actor_email) = match e.actor_id.parse::<Uuid>() {
                    Ok(uid) => {
                        let email: Option<String> =
                            sqlx::query_scalar!("SELECT email FROM users WHERE id = $1", uid)
                                .fetch_optional(&state.db)
                                .await?;
                        (e.actor_id.clone(), email.unwrap_or_else(|| e.actor_id.clone()))
                    }
                    Err(_) => (e.actor_id.clone(), e.actor_id.clone()),
                };
                // parsed_timestamp() borrows `e`, so compute it before the
                // struct literal below partially moves fields out of `e`.
                let created_at = e.parsed_timestamp();
                out.push(AuditTrailEntry {
                    id: e.entry_id,
                    actor_id,
                    actor_email,
                    action: e.action,
                    document_id: if e.document_id.is_empty() {
                        None
                    } else {
                        Some(e.document_id)
                    },
                    created_at,
                });
            }
            return Ok(Json(out));
        }
        Err(e) => {
            tracing::warn!(error = %e, %case_id, "ledger trail unreachable, falling back to Postgres mirror");
        }
    }

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
        id: r.id.to_string(),
        actor_id: r.actor_id.to_string(),
        actor_email: r.actor_email,
        action: r.action,
        document_id: r.document_id.map(|d| d.to_string()),
        created_at: r.created_at,
    })
    .collect();

    Ok(Json(rows))
}

#[derive(Deserialize)]
struct DemoEntryBody {
    entry_id: Option<String>,
}

/// DEMO ONLY (admin). Corrupts one ledger entry without updating its hash so
/// the next GET /audit/verify-chain reports the breach. No entry_id = tamper
/// the most recent entry. Proxied straight through from the Ledger Service.
async fn demo_tamper(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    body: Option<Json<DemoEntryBody>>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&user, &[Role::Admin])?;
    // Lenient body: missing/empty body (or {"entry_id":null}) = tamper latest.
    let entry_id = body.and_then(|b| b.0.entry_id);
    let value =
        ledger_client::demo_tamper_ledger(&state.config.ledger_service_url, entry_id).await?;
    tracing::warn!(user_id = %user.user_id, "DEMO tamper injected via /audit/demo/tamper");
    Ok(Json(value))
}

/// DEMO ONLY (admin). Undoes demo tampering (restores pre-tamper entry state).
async fn demo_restore(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    body: Option<Json<DemoEntryBody>>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&user, &[Role::Admin])?;
    let entry_id = body.and_then(|b| b.0.entry_id);
    let value =
        ledger_client::demo_restore_ledger(&state.config.ledger_service_url, entry_id).await?;
    tracing::warn!(user_id = %user.user_id, "DEMO restore via /audit/demo/restore");
    Ok(Json(value))
}
