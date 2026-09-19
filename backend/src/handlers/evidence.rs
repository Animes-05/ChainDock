use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::Row;
use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::AuthenticatedUser,
    handlers::audit,
    ledger_client,
    models::Role,
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/evidence", get(list_all_evidence).post(create_evidence_root))
        .route("/evidence/:id", get(get_evidence))
        .route("/evidence/:id/transfer", post(transfer_custody))
        .route(
            "/cases/:id/evidence",
            get(list_case_evidence).post(create_case_evidence),
        )
}

#[derive(Serialize)]
struct CustodyEventResponse {
    id: String,
    timestamp: DateTime<Utc>,
    actor: String,
    role: String,
    action: String,
    prev_custodian: String,
    new_custodian: String,
    location: String,
    notes: String,
    tx_hash: String,
}

#[derive(Serialize)]
struct EvidenceResponse {
    id: String,
    case_id: String,
    case_number: String,
    item_number: String,
    name: String,
    category: String,
    description: String,
    custodian: String,
    custodian_badge: String,
    location: String,
    sealed_at: DateTime<Utc>,
    chain_hash: String,
    status: String,
    custody_events: Vec<CustodyEventResponse>,
}

struct DocRow {
    id: Uuid,
    case_id: Uuid,
    case_number: String,
    title: String,
    doc_type: String,
    description: String,
    file_hash: String,
    created_at: DateTime<Utc>,
    custodian_email: String,
}

async fn assert_case_access(
    state: &AppState,
    user: &AuthenticatedUser,
    case_id: Uuid,
) -> Result<(), AppError> {
    if matches!(user.role, Role::Supervisor | Role::Admin) {
        return Ok(());
    }
    let row = sqlx::query("SELECT 1 as one FROM case_assignments WHERE case_id = $1 AND user_id = $2")
        .bind(case_id)
        .bind(user.user_id)
        .fetch_optional(&state.db)
        .await
        .map_err(AppError::Database)?;
    if row.is_some() {
        Ok(())
    } else {
        Err(AppError::Forbidden)
    }
}

async fn custody_events_for(
    state: &AppState,
    document_id: Uuid,
) -> Result<Vec<CustodyEventResponse>, AppError> {
    let rows = sqlx::query(
        r#"SELECT a.id, a.action, a.created_at, u.email as actor_email
           FROM audit_log a JOIN users u ON u.id = a.actor_id
           WHERE a.document_id = $1 ORDER BY a.seq ASC"#,
    )
    .bind(document_id)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::Database)?;

    let mut out = Vec::with_capacity(rows.len());
    for r in rows {
        let id: Uuid = r.try_get("id").map_err(AppError::Database)?;
        let action: String = r.try_get("action").map_err(AppError::Database)?;
        let created_at: DateTime<Utc> = r.try_get("created_at").map_err(AppError::Database)?;
        let actor_email: String = r.try_get("actor_email").map_err(AppError::Database)?;
        out.push(CustodyEventResponse {
            id: id.to_string(),
            timestamp: created_at,
            actor: actor_email,
            role: "INVESTIGATOR".to_string(),
            action,
            prev_custodian: String::new(),
            new_custodian: String::new(),
            location: "Central Evidence Locker".to_string(),
            notes: String::new(),
            tx_hash: id.to_string(),
        });
    }
    Ok(out)
}

fn project(row: &DocRow, events: Vec<CustodyEventResponse>) -> EvidenceResponse {
    let short = row.id.to_string().chars().take(8).collect::<String>();
    EvidenceResponse {
        id: row.id.to_string(),
        case_id: row.case_id.to_string(),
        case_number: row.case_number.clone(),
        item_number: format!("EVI-{short}"),
        name: row.title.clone(),
        category: row.doc_type.clone(),
        description: row.description.clone(),
        custodian: row.custodian_email.clone(),
        custodian_badge: "POL-VAULT".to_string(),
        location: "Central Evidence Locker".to_string(),
        sealed_at: row.created_at,
        chain_hash: row.file_hash.clone(),
        status: "SECURE_VAULT".to_string(),
        custody_events: events,
    }
}

async fn fetch_doc_row(state: &AppState, id: Uuid) -> Result<DocRow, AppError> {
    let row = sqlx::query(
        r#"SELECT d.id, d.case_id, c.case_number, d.title, d.doc_type, d.description,
                  d.file_hash, d.created_at, u.email as custodian_email
           FROM documents d
           JOIN cases c ON c.id = d.case_id
           JOIN users u ON u.id = d.uploaded_by
           WHERE d.id = $1"#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::Database)?
    .ok_or(AppError::NotFound)?;

    Ok(DocRow {
        id: row.try_get("id").map_err(AppError::Database)?,
        case_id: row.try_get("case_id").map_err(AppError::Database)?,
        case_number: row.try_get("case_number").map_err(AppError::Database)?,
        title: row.try_get("title").map_err(AppError::Database)?,
        doc_type: row.try_get("doc_type").map_err(AppError::Database)?,
        description: row.try_get("description").map_err(AppError::Database)?,
        file_hash: row.try_get("file_hash").map_err(AppError::Database)?,
        created_at: row.try_get("created_at").map_err(AppError::Database)?,
        custodian_email: row.try_get("custodian_email").map_err(AppError::Database)?,
    })
}

async fn list_docs_for_case(state: &AppState, case_id: Uuid) -> Result<Vec<DocRow>, AppError> {
    let rows = sqlx::query(
        r#"SELECT d.id, d.case_id, c.case_number, d.title, d.doc_type, d.description,
                  d.file_hash, d.created_at, u.email as custodian_email
           FROM documents d
           JOIN cases c ON c.id = d.case_id
           JOIN users u ON u.id = d.uploaded_by
           WHERE d.case_id = $1 ORDER BY d.created_at DESC"#,
    )
    .bind(case_id)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::Database)?;

    let mut out = Vec::with_capacity(rows.len());
    for r in &rows {
        out.push(DocRow {
            id: r.try_get("id").map_err(AppError::Database)?,
            case_id: r.try_get("case_id").map_err(AppError::Database)?,
            case_number: r.try_get("case_number").map_err(AppError::Database)?,
            title: r.try_get("title").map_err(AppError::Database)?,
            doc_type: r.try_get("doc_type").map_err(AppError::Database)?,
            description: r.try_get("description").map_err(AppError::Database)?,
            file_hash: r.try_get("file_hash").map_err(AppError::Database)?,
            created_at: r.try_get("created_at").map_err(AppError::Database)?,
            custodian_email: r.try_get("custodian_email").map_err(AppError::Database)?,
        });
    }
    Ok(out)
}

async fn list_case_evidence(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(case_id): Path<Uuid>,
) -> Result<Json<Vec<EvidenceResponse>>, AppError> {
    assert_case_access(&state, &user, case_id).await?;
    let docs = list_docs_for_case(&state, case_id).await?;
    let mut out = Vec::with_capacity(docs.len());
    for d in &docs {
        let events = custody_events_for(&state, d.id).await?;
        out.push(project(d, events));
    }
    Ok(Json(out))
}

async fn list_all_evidence(
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> Result<Json<Vec<EvidenceResponse>>, AppError> {
    let sql = if matches!(user.role, Role::Supervisor | Role::Admin) {
        r#"SELECT d.id, d.case_id, c.case_number, d.title, d.doc_type, d.description,
                  d.file_hash, d.created_at, u.email as custodian_email
           FROM documents d
           JOIN cases c ON c.id = d.case_id
           JOIN users u ON u.id = d.uploaded_by
           ORDER BY d.created_at DESC"#
    } else {
        r#"SELECT d.id, d.case_id, c.case_number, d.title, d.doc_type, d.description,
                  d.file_hash, d.created_at, u.email as custodian_email
           FROM documents d
           JOIN cases c ON c.id = d.case_id
           JOIN users u ON u.id = d.uploaded_by
           JOIN case_assignments ca ON ca.case_id = d.case_id AND ca.user_id = $1
           ORDER BY d.created_at DESC"#
    };

    let mut q = sqlx::query(sql);
    if matches!(user.role, Role::Investigator) {
        q = q.bind(user.user_id);
    }
    let rows = q.fetch_all(&state.db).await.map_err(AppError::Database)?;

    let mut docs = Vec::with_capacity(rows.len());
    for r in &rows {
        docs.push(DocRow {
            id: r.try_get("id").map_err(AppError::Database)?,
            case_id: r.try_get("case_id").map_err(AppError::Database)?,
            case_number: r.try_get("case_number").map_err(AppError::Database)?,
            title: r.try_get("title").map_err(AppError::Database)?,
            doc_type: r.try_get("doc_type").map_err(AppError::Database)?,
            description: r.try_get("description").map_err(AppError::Database)?,
            file_hash: r.try_get("file_hash").map_err(AppError::Database)?,
            created_at: r.try_get("created_at").map_err(AppError::Database)?,
            custodian_email: r.try_get("custodian_email").map_err(AppError::Database)?,
        });
    }

    let mut out = Vec::with_capacity(docs.len());
    for d in &docs {
        let events = custody_events_for(&state, d.id).await?;
        out.push(project(d, events));
    }
    Ok(Json(out))
}

async fn get_evidence(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(id): Path<Uuid>,
) -> Result<Json<EvidenceResponse>, AppError> {
    let doc = fetch_doc_row(&state, id).await?;
    assert_case_access(&state, &user, doc.case_id).await?;
    let events = custody_events_for(&state, doc.id).await?;
    Ok(Json(project(&doc, events)))
}

#[derive(Deserialize)]
struct CreateEvidenceBody {
    case_id: Option<Uuid>,
    item_number: Option<String>,
    name: Option<String>,
    category: Option<String>,
    description: Option<String>,
    location: Option<String>,
}

async fn insert_evidence_doc(
    state: &AppState,
    user: &AuthenticatedUser,
    case_id: Uuid,
    body: CreateEvidenceBody,
) -> Result<DocRow, AppError> {
    assert_case_access(state, user, case_id).await?;

    let name = body.name.unwrap_or_else(|| "Unnamed Evidence Exhibit".to_string());
    let category = body.category.unwrap_or_else(|| "PHYSICAL_EQUIPMENT".to_string());
    let description = body.description.unwrap_or_default();
    if name.trim().is_empty() {
        return Err(AppError::BadRequest("name is required".into()));
    }

    let mut hasher = Sha256::new();
    hasher.update(name.as_bytes());
    hasher.update(
        body.item_number
            .unwrap_or_default()
            .as_bytes(),
    );
    hasher.update(Utc::now().to_rfc3339().as_bytes());
    let file_hash = hex::encode(hasher.finalize());

    let doc_id = Uuid::new_v4();
    let file_path = format!("evidence-placeholder/{doc_id}");

    let mut tx = state.db.begin().await.map_err(AppError::Database)?;
    sqlx::query(
        r#"INSERT INTO documents (id, case_id, uploaded_by, title, doc_type, description, file_path, file_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
    )
    .bind(doc_id)
    .bind(case_id)
    .bind(user.user_id)
    .bind(&name)
    .bind(&category)
    .bind(&description)
    .bind(&file_path)
    .bind(&file_hash)
    .execute(&mut *tx)
    .await
    .map_err(AppError::Database)?;

    audit::append_entry(&mut tx, user.user_id, "UPLOAD", Some(doc_id), Some(case_id))
        .await?;

    tx.commit().await.map_err(AppError::Database)?;

    if let Err(e) = ledger_client::append_ledger_entry(
        &state.config.ledger_service_url,
        user.user_id,
        "UPLOAD",
        Some(doc_id),
        Some(case_id),
    )
    .await
    {
        tracing::error!(error = %e, %doc_id, %case_id, "ledger append failed after evidence register");
    }

    fetch_doc_row(state, doc_id).await
}

async fn create_case_evidence(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(case_id): Path<Uuid>,
    Json(body): Json<CreateEvidenceBody>,
) -> Result<Json<EvidenceResponse>, AppError> {
    let doc = insert_evidence_doc(&state, &user, case_id, body).await?;
    let events = custody_events_for(&state, doc.id).await?;
    Ok(Json(project(&doc, events)))
}

async fn create_evidence_root(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Json(body): Json<CreateEvidenceBody>,
) -> Result<Json<EvidenceResponse>, AppError> {
    let case_id = body
        .case_id
        .ok_or_else(|| AppError::BadRequest("case_id is required".into()))?;
    // Rebuild body without moving case_id twice: fetch fresh via destructure workaround.
    let doc = insert_evidence_doc(
        &state,
        &user,
        case_id,
        CreateEvidenceBody {
            case_id: Some(case_id),
            item_number: body.item_number,
            name: body.name,
            category: body.category,
            description: body.description,
            location: body.location,
        },
    )
    .await?;
    let events = custody_events_for(&state, doc.id).await?;
    Ok(Json(project(&doc, events)))
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct TransferBody {
    actor: Option<String>,
    new_custodian: Option<String>,
    location: Option<String>,
    notes: Option<String>,
}

async fn transfer_custody(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(id): Path<Uuid>,
    Json(_body): Json<TransferBody>,
) -> Result<Json<EvidenceResponse>, AppError> {
    let doc = fetch_doc_row(&state, id).await?;
    assert_case_access(&state, &user, doc.case_id).await?;

    let mut tx = state.db.begin().await.map_err(AppError::Database)?;
    audit::append_entry(&mut tx, user.user_id, "TRANSFER", Some(id), Some(doc.case_id)).await?;
    tx.commit().await.map_err(AppError::Database)?;

    if let Err(e) = ledger_client::append_ledger_entry(
        &state.config.ledger_service_url,
        user.user_id,
        "TRANSFER",
        Some(id),
        Some(doc.case_id),
    )
    .await
    {
        tracing::error!(error = %e, %id, "ledger append failed after evidence transfer");
    }

    let events = custody_events_for(&state, doc.id).await?;
    Ok(Json(project(&doc, events)))
}
