use axum::{
    extract::{Multipart, Path, Query, State},
    http::header,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::{error::AppError, extractors::AuthenticatedUser, handlers::audit, models::Role, AppState};

// Local disk for MVP per ARCHITECTURE.md — swap for S3-compatible storage post-hackathon
// if needed, not now.
const DOCUMENTS_DIR: &str = "data/documents";

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/cases/:case_id/documents", post(upload_document).get(list_documents))
        .route("/documents/:id", get(get_document))
        .route("/documents/:id/download", get(download_document))
}

/// Shared access check: supervisor/admin see every case; investigators only cases
/// they're assigned to via case_assignments. Mirrors the scoping in GET /cases.
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

#[derive(Serialize)]
struct DocumentResponse {
    id: Uuid,
    case_id: Uuid,
    uploaded_by: Uuid,
    title: String,
    doc_type: String,
    description: String,
    file_hash: String,
    version: i32,
}

/// Multipart upload: fields `title`, `doc_type`, `description` (optional), `file`.
/// Hash is computed synchronously over the whole file — fine at hackathon file sizes,
/// no need for a streaming hasher.
///
/// The file write to disk happens before the DB transaction opens (a written file with
/// no DB row is harmless orphaned data; a committed DB row with no file would be a lot
/// worse). The document insert + UPLOAD audit row are then one transaction, so they
/// either both land or both roll back together.
async fn upload_document(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(case_id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<DocumentResponse>, AppError> {
    assert_case_access(&state, &user, case_id).await?;

    let mut title: Option<String> = None;
    let mut doc_type: Option<String> = None;
    let mut description = String::new();
    let mut file_bytes: Option<Vec<u8>> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| AppError::BadRequest("invalid multipart body".into()))?
    {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "title" => {
                title = Some(
                    field
                        .text()
                        .await
                        .map_err(|_| AppError::BadRequest("invalid title field".into()))?,
                )
            }
            "doc_type" => {
                doc_type = Some(
                    field
                        .text()
                        .await
                        .map_err(|_| AppError::BadRequest("invalid doc_type field".into()))?,
                )
            }
            "description" => {
                description = field
                    .text()
                    .await
                    .map_err(|_| AppError::BadRequest("invalid description field".into()))?;
            }
            "file" => {
                let bytes = field
                    .bytes()
                    .await
                    .map_err(|_| AppError::BadRequest("invalid file field".into()))?;
                file_bytes = Some(bytes.to_vec());
            }
            _ => {}
        }
    }

    let title = title.ok_or_else(|| AppError::BadRequest("title is required".into()))?;
    let doc_type = doc_type.ok_or_else(|| AppError::BadRequest("doc_type is required".into()))?;
    let file_bytes =
        file_bytes.ok_or_else(|| AppError::BadRequest("file is required".into()))?;

    if title.trim().is_empty() || doc_type.trim().is_empty() {
        return Err(AppError::BadRequest("title and doc_type cannot be empty".into()));
    }

    let mut hasher = Sha256::new();
    hasher.update(&file_bytes);
    let file_hash = hex::encode(hasher.finalize());

    let doc_id = Uuid::new_v4();
    tokio::fs::create_dir_all(DOCUMENTS_DIR)
        .await
        .map_err(|_| AppError::BadRequest("failed to prepare storage directory".into()))?;
    let file_path = format!("{DOCUMENTS_DIR}/{doc_id}");
    tokio::fs::write(&file_path, &file_bytes)
        .await
        .map_err(|_| AppError::BadRequest("failed to write file to disk".into()))?;

    let mut tx = state.db.begin().await?;

    sqlx::query!(
        r#"
        INSERT INTO documents (id, case_id, uploaded_by, title, doc_type, description, file_path, file_hash)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
        doc_id,
        case_id,
        user.user_id,
        title,
        doc_type,
        description,
        file_path,
        file_hash
    )
    .execute(&mut *tx)
    .await?;

    audit::append_entry(&mut tx, user.user_id, "UPLOAD", Some(doc_id), Some(case_id)).await?;

    tx.commit().await?;

    Ok(Json(DocumentResponse {
        id: doc_id,
        case_id,
        uploaded_by: user.user_id,
        title,
        doc_type,
        description,
        file_hash,
        version: 1,
    }))
}

#[derive(Deserialize)]
struct ListDocumentsQuery {
    q: Option<String>,
}

/// Full-text search via the generated `search_vector` column (Postgres tsvector), not
/// a search engine — per ARCHITECTURE.md. `q` is optional; omitted means plain listing.
async fn list_documents(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(case_id): Path<Uuid>,
    Query(params): Query<ListDocumentsQuery>,
) -> Result<Json<Vec<DocumentResponse>>, AppError> {
    assert_case_access(&state, &user, case_id).await?;

    let rows = if let Some(q) = params.q.filter(|q| !q.trim().is_empty()) {
        sqlx::query!(
            r#"
            SELECT id, case_id, uploaded_by, title, doc_type, description, file_hash, version
            FROM documents
            WHERE case_id = $1 AND search_vector @@ plainto_tsquery('english', $2)
            ORDER BY ts_rank(search_vector, plainto_tsquery('english', $2)) DESC
            "#,
            case_id,
            q
        )
        .fetch_all(&state.db)
        .await?
        .into_iter()
        .map(|r| DocumentResponse {
            id: r.id,
            case_id: r.case_id,
            uploaded_by: r.uploaded_by,
            title: r.title,
            doc_type: r.doc_type,
            description: r.description,
            file_hash: r.file_hash,
            version: r.version,
        })
        .collect()
    } else {
        sqlx::query!(
            r#"
            SELECT id, case_id, uploaded_by, title, doc_type, description, file_hash, version
            FROM documents
            WHERE case_id = $1
            ORDER BY created_at DESC
            "#,
            case_id
        )
        .fetch_all(&state.db)
        .await?
        .into_iter()
        .map(|r| DocumentResponse {
            id: r.id,
            case_id: r.case_id,
            uploaded_by: r.uploaded_by,
            title: r.title,
            doc_type: r.doc_type,
            description: r.description,
            file_hash: r.file_hash,
            version: r.version,
        })
        .collect()
    };

    Ok(Json(rows))
}

struct DocumentRow {
    id: Uuid,
    case_id: Uuid,
    uploaded_by: Uuid,
    title: String,
    doc_type: String,
    description: String,
    file_path: String,
    file_hash: String,
    version: i32,
}

async fn fetch_document_row(state: &AppState, id: Uuid) -> Result<DocumentRow, AppError> {
    sqlx::query_as!(
        DocumentRow,
        r#"SELECT id, case_id, uploaded_by, title, doc_type, description, file_path, file_hash, version
           FROM documents WHERE id = $1"#,
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)
}

/// Metadata only — the download link is just this same base path + `/download`,
/// no signed URL scheme needed for a hackathon MVP.
async fn get_document(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(id): Path<Uuid>,
) -> Result<Json<DocumentResponse>, AppError> {
    let row = fetch_document_row(&state, id).await?;
    assert_case_access(&state, &user, row.case_id).await?;

    Ok(Json(DocumentResponse {
        id: row.id,
        case_id: row.case_id,
        uploaded_by: row.uploaded_by,
        title: row.title,
        doc_type: row.doc_type,
        description: row.description,
        file_hash: row.file_hash,
        version: row.version,
    }))
}

/// Streams the file back with a generic octet-stream content-type — the original
/// upload's content-type isn't tracked (out of scope), and a generic download-safe
/// header is fine for this system's use case.
async fn download_document(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Path(id): Path<Uuid>,
) -> Result<Response, AppError> {
    let row = fetch_document_row(&state, id).await?;
    assert_case_access(&state, &user, row.case_id).await?;

    let bytes = tokio::fs::read(&row.file_path)
        .await
        .map_err(|_| AppError::NotFound)?;

    let filename = format!("{}-{}", row.id, row.title.replace(' ', "_"));

    Ok((
        [
            (header::CONTENT_TYPE, "application/octet-stream".to_string()),
            (
                header::CONTENT_DISPOSITION,
                format!("attachment; filename=\"{filename}\""),
            ),
        ],
        bytes,
    )
        .into_response())
}
