//! Thin HTTP client to the Ledger Service (see DESIGN.md §2).
//!
//! Axum never talks to Fabric directly — only to these 3 endpoints:
//!   POST /ledger/entries
//!   GET  /ledger/cases/:case_id/trail
//!   GET  /ledger/verify
//!
//! All failures map to `AppError::Ledger`, which audit.rs treats as "fall back
//! to the Postgres mirror" rather than failing the user request (demo-safety:
//! a dead ledger must not take down case/document writes).

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use uuid::Uuid;

use crate::error::AppError;

/// Mirror of the chaincode Entry + Ledger Service JSON (see
/// ledger-service/chaincode/src/chaindockContract.ts and
/// ledger-service/src/store.ts).
#[derive(Debug, Clone, Deserialize)]
pub struct LedgerEntry {
    #[serde(rename = "docType", default)]
    pub doc_type: String,
    #[serde(rename = "entryId")]
    pub entry_id: String,
    #[serde(rename = "actorId")]
    pub actor_id: String,
    pub action: String,
    #[serde(rename = "documentId", default)]
    pub document_id: String,
    #[serde(rename = "caseId", default)]
    pub case_id: String,
    pub timestamp: String,
    #[serde(rename = "entryHash")]
    pub entry_hash: String,
    /// Logical org (POLICE/COURT/FORENSICS); '' when unset (back-compat).
    #[serde(rename = "orgId", default)]
    pub org_id: String,
}

impl LedgerEntry {
    pub fn parsed_timestamp(&self) -> DateTime<Utc> {
        self.timestamp
            .parse::<DateTime<Utc>>()
            .unwrap_or_else(|_| Utc::now())
    }
}

#[derive(Debug, Deserialize)]
pub struct LedgerVerifyResponse {
    pub valid: bool,
    pub total_entries: i64,
    pub broken_at_id: Option<String>,
}

#[derive(Debug, Serialize)]
struct AppendBody {
    actor_id: String,
    action: String,
    document_id: String,
    case_id: String,
    timestamp: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    org_id: String,
}

#[derive(Debug, Deserialize)]
struct AppendResponse {
    #[serde(rename = "entryId")]
    entry_id: String,
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .expect("failed to build ledger http client")
}

fn base(base_url: &str) -> String {
    base_url.trim_end_matches('/').to_string()
}

/// Canonical logical orgs for the simulated multi-org demo (Option A).
/// Unknown values become '' (back-compat, hashes exactly as before).
fn normalize_org_id(raw: &str) -> String {
    match raw.trim().to_uppercase().as_str() {
        "POLICE" | "COURT" | "FORENSICS" => raw.trim().to_uppercase(),
        _ => String::new(),
    }
}

/// Default org tag applied when a handler doesn't specify one.
/// Set DEFAULT_ORG=POLICE (etc.) on Railway to tag all writes from this instance.
fn default_org() -> String {
    normalize_org_id(&std::env::var("DEFAULT_ORG").unwrap_or_default())
}

/// Append one custody/audit event. Call AFTER the Postgres transaction commits —
/// there is no shared 2-phase commit between Postgres and Fabric (see
/// ARCHITECTURE.md §4). A Postgres row with no ledger entry is a gap to log
/// loudly, not something to roll back.
pub async fn append_ledger_entry(
    base_url: &str,
    actor_id: Uuid,
    action: &str,
    document_id: Option<Uuid>,
    case_id: Option<Uuid>,
    org_id: Option<&str>,
) -> Result<String, AppError> {
    let org = {
        let explicit = normalize_org_id(org_id.unwrap_or_default());
        if explicit.is_empty() {
            default_org()
        } else {
            explicit
        }
    };
    let body = AppendBody {
        actor_id: actor_id.to_string(),
        action: action.to_string(),
        document_id: document_id.map(|d| d.to_string()).unwrap_or_default(),
        case_id: case_id.map(|c| c.to_string()).unwrap_or_default(),
        timestamp: Utc::now().to_rfc3339(),
        org_id: org,
    };
    let url = format!("{}/ledger/entries", base(base_url));
    let res = client()
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::Ledger(format!("ledger append unreachable: {e}")))?;
    if !res.status().is_success() {
        return Err(AppError::Ledger(format!(
            "ledger append rejected: {}",
            res.status()
        )));
    }
    let parsed: AppendResponse = res
        .json()
        .await
        .map_err(|e| AppError::Ledger(format!("ledger append bad body: {e}")))?;
    Ok(parsed.entry_id)
}

pub async fn get_ledger_trail(
    base_url: &str,
    case_id: Uuid,
) -> Result<Vec<LedgerEntry>, AppError> {
    let url = format!("{}/ledger/cases/{}/trail", base(base_url), case_id);
    let res = client()
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::Ledger(format!("ledger trail unreachable: {e}")))?;
    if !res.status().is_success() {
        return Err(AppError::Ledger(format!(
            "ledger trail rejected: {}",
            res.status()
        )));
    }
    res.json::<Vec<LedgerEntry>>()
        .await
        .map_err(|e| AppError::Ledger(format!("ledger trail bad body: {e}")))
}

#[derive(Debug, Deserialize, Serialize)]
pub struct LedgerOrgCount {
    pub org_id: String,
    pub count: i64,
}

/// Proxies GET /ledger/orgs (mock-mode per-org counts for the multi-org demo).
pub async fn get_ledger_orgs(base_url: &str) -> Result<Vec<LedgerOrgCount>, AppError> {
    let url = format!("{}/ledger/orgs", base(base_url));
    let res = client()
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::Ledger(format!("ledger orgs unreachable: {e}")))?;
    if !res.status().is_success() {
        return Err(AppError::Ledger(format!(
            "ledger orgs rejected: {}",
            res.status()
        )));
    }
    #[derive(Deserialize)]
    struct OrgsResponse {
        #[serde(default)]
        orgs: Vec<LedgerOrgCount>,
    }
    let parsed: OrgsResponse = res
        .json()
        .await
        .map_err(|e| AppError::Ledger(format!("ledger orgs bad body: {e}")))?;
    Ok(parsed.orgs)
}

/// DEMO ONLY — forwards tamper injection to the Ledger Service (mock mode).
/// Passes the service's JSON straight through ({tampered_entry_id} on success).
/// In fabric mode the service answers 501 (tamper via CouchDB instead).
pub async fn demo_tamper_ledger(
    base_url: &str,
    entry_id: Option<String>,
) -> Result<serde_json::Value, AppError> {
    let url = format!("{}/ledger/demo/tamper", base(base_url));
    let body = serde_json::json!({ "entry_id": entry_id });
    let res = client()
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::Ledger(format!("ledger demo/tamper unreachable: {e}")))?;
    let status = res.status();
    let value: serde_json::Value = res
        .json()
        .await
        .map_err(|e| AppError::Ledger(format!("ledger demo/tamper bad body: {e}")))?;
    if !status.is_success() {
        return Err(AppError::Ledger(format!("ledger demo/tamper rejected ({status}): {value}")));
    }
    Ok(value)
}

/// DEMO ONLY — forwards chain restore ({restored_entry_ids} on success).
pub async fn demo_restore_ledger(
    base_url: &str,
    entry_id: Option<String>,
) -> Result<serde_json::Value, AppError> {
    let url = format!("{}/ledger/demo/restore", base(base_url));
    let body = serde_json::json!({ "entry_id": entry_id });
    let res = client()
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::Ledger(format!("ledger demo/restore unreachable: {e}")))?;
    let status = res.status();
    let value: serde_json::Value = res
        .json()
        .await
        .map_err(|e| AppError::Ledger(format!("ledger demo/restore bad body: {e}")))?;
    if !status.is_success() {
        return Err(AppError::Ledger(format!("ledger demo/restore rejected ({status}): {value}")));
    }
    Ok(value)
}

pub async fn verify_ledger(base_url: &str) -> Result<LedgerVerifyResponse, AppError> {
    let url = format!("{}/ledger/verify", base(base_url));
    let res = client()
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::Ledger(format!("ledger verify unreachable: {e}")))?;
    if !res.status().is_success() {
        return Err(AppError::Ledger(format!(
            "ledger verify rejected: {}",
            res.status()
        )));
    }
    res.json::<LedgerVerifyResponse>()
        .await
        .map_err(|e| AppError::Ledger(format!("ledger verify bad body: {e}")))
}
