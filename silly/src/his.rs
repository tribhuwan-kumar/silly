use axum::{
    Json,
    extract::{State, Query},
    response::{IntoResponse},
};
use tokio::time::{self, Duration};
use std::path::Path;
use chrono::NaiveDateTime;
use tokio::sync::broadcast;
use serde_json::{Value, json};
use tracing::{info, error, warn};
use url::Url;
use serde::{Serialize, Deserialize};
use tracing::debug;
use std::collections::HashMap;

use crate::{
    AppState,
    auth::types::AuthenticatedUser,
    aria2::types::Aria2JsonRpcResp
};

pub struct History;
pub struct Extraction;
pub struct HistoryService;


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BitTorrentInfo {
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum BitTorrentMode {
    Single,
    Multi
} 

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Aria2Uri {
    pub uri: String,
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Aria2File {
    pub index: String,
    pub path: String,
    pub length: String,
    #[serde(rename = "completedLength")]
    pub completed_length: String,
    pub selected: String,
    pub uris: Vec<Aria2Uri>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BitTorrent {
    #[serde(rename = "announceList")]
    pub announce_list: Option<Vec<Vec<String>>>,
    pub comment: Option<String>,
    #[serde(rename = "creationDate")]
    pub creation_date: Option<i64>,
    pub mode: Option<BitTorrentMode>,
    pub info: Option<BitTorrentInfo>,
}

#[derive(Debug, Clone, Serialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "TEXT")]
#[sqlx(rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum GidStatus {
    /// onDownloadError
    Error,
    /// onDownloadPause
    Paused,
    /// onDownloadStart, `aria2.tellActive`
    Active,
    /// `aria2.tellWaiting`
    Waiting,
    /// onDownloadStop also file is removed
    Removed,
    /// onDownloadStop but the `file-allocation` exists
    Stopped,
    /// onDownloadComplete or onBtDownloadComplete
    Complete,
}


#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GlobalStat {
    #[serde(rename = "downloadSpeed")]
    pub download_speed: String,
    #[serde(rename = "uploadSpeed")]
    pub upload_speed: String,
    #[serde(rename = "numActive")]
    pub num_active: String,
    #[serde(rename = "numWaiting")]
    pub num_waiting: String,
    #[serde(rename = "numStopped")]
    pub num_stopped: String,
    #[serde(rename = "numStoppedTotal")]
    pub num_stopped_total: String,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Aria2Res {
    pub gid: String,
    pub status: String,
    pub dir: String,
    #[serde(rename = "downloadSpeed")]
    pub download_speed: String,
    #[serde(rename = "uploadSpeed")]
    pub upload_speed: String,
    #[serde(rename = "totalLength")]
    pub total_length: String,
    #[serde(rename = "completedLength")]
    pub completed_length: String,
    #[serde(rename = "uploadLength")]
    pub upload_length: String,
    #[serde(rename = "errorCode")]
    pub error_code: Option<String>,
    #[serde(rename = "errorMessage")]
    pub error_message: Option<String>,
    #[serde(rename = "infoHash")]
    pub info_hash: Option<String>,
    pub bittorrent: Option<BitTorrent>,
    pub files: Vec<Aria2File>,
    pub connection: Option<String>,
    #[serde(rename = "numPieces")]
    pub num_pieces: Option<String>,
    #[serde(rename = "numSeeders")]
    pub num_seeders: Option<String>,
    /// aria2 res is string: 'true' | 'false'
    pub seeder: Option<String>,
}

/// These structs are defined based on the `1DM Manager android`
#[derive(Serialize, Debug, Clone, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ItemMetaData {
    pub gid: String,
    /// torrent or DDl actual name
    pub name: Option<String>,
    /// What's the status
    pub status: GidStatus,
    /// Directory where its being downloaded
    pub dir: Option<String>,
    /// Acutal path of the content being downloaded
    /// It can be multiple for torrents; storing json array
    pub files: Option<String>,
    /// Total length of content it gonna download
    pub total_length: Option<String>,
    /// How much its completed
    pub completed_length: Option<String>,
    /// How much its uploaded
    pub uploaded_length: Option<String>,
    /// Source only for uri based DLs `Download link`
    pub source_uri: Option<String>,
    /// Hash of the magnets or torrent
    pub info_hash: Option<String>,
    /// if the download failed for some reason
    pub error_code: Option<i64>,
    /// Message for that error code
    pub error_message: Option<String>,
    /// Is it a torrent/magnet??
    pub is_torrent: Option<bool>,
    /// When does that dl created
    pub created_at: Option<NaiveDateTime>,
    /// when does that dl completed
    pub completed_at: Option<NaiveDateTime>,
    /// Belonging, only server side
    #[serde(skip)]
    pub user_id: i64,
}


#[derive(Clone, Serialize, Debug)]
#[serde(tag = "type")]
#[serde(rename_all = "camelCase")]
pub enum DdlWsMessage {
    #[serde(rename = "tick")]
    Tick {
        #[serde(skip)]
        user_id: i64,
        global: GlobalStat,
        tasks: Vec<Aria2Res>,
    },
    #[serde(rename = "event")]
    Event {
        #[serde(skip)]
        user_id: i64,
        data: ItemMetaData,
    }
}

impl Extraction {
    pub fn extract(json: &Value, gid: &str) -> ItemMetaData {
        let info: Aria2Res = match serde_json::from_value(json.clone()) {
            Ok(v) => v,
            Err(e) => {
                /* If empty response, return skeleton, something diasater happened */
                error!("Failed to parse aria2 status for {}: {}", gid, e);
                return Self::skeleton(gid);
            }
        };
        debug!("extraction info: {:?}", info);
        let mut source_uri: Option<String> = None;
        let name = Self::resolve_name(&info);

        let file_paths: Vec<String> = info.files.iter()
            .map(|f| f.path.clone())
            .filter(|p| !p.is_empty())
            .collect();
        let files_json = serde_json::to_string(&file_paths).ok();
        debug!("files json from `extract`: {:?}", files_json);

        let status = match info.status.as_str() {
            "active"   => GidStatus::Active,
            "waiting"  => GidStatus::Waiting,
            "paused"   => GidStatus::Paused,
            "error"    => GidStatus::Error,
            "complete" => GidStatus::Complete,
            "removed"  => {
                let exists = file_paths.iter().any(|p| Path::new(p).exists());
                if exists {
                    GidStatus::Stopped
                } else {
                    GidStatus::Removed
                }
            },
            _ => GidStatus::Stopped,
        };

        let is_torrent = info.bittorrent.is_some();

        if let Some(file) = info.files.first() {
            // Find first non-empty uri
            source_uri = file.uris.iter()
                .find(|u| !u.uri.is_empty())
                .map(|u| u.uri.clone());
        }

        ItemMetaData {
            gid: gid.to_string(),
            name: Some(name),
            status,
            user_id: 0,
            is_torrent: Some(is_torrent),
            total_length: Some(info.total_length),
            completed_length: Some(info.completed_length),
            uploaded_length: Some(info.upload_length),
            dir: Some(info.dir),
            files: files_json,
            source_uri: source_uri,
            info_hash: info.info_hash,
            error_code: info.error_code.and_then(|c| c.parse().ok()),
            error_message: info.error_message,
            created_at: None,
            completed_at: None,
        }
    }

    fn resolve_name(info: &Aria2Res) -> String {
        // BitTorrent name metadata exists
        if let Some(name) = info.bittorrent.as_ref()
            .and_then(|bt| bt.info.as_ref())
            .and_then(|bt_info| bt_info.name.as_ref())
            .filter(|n| !n.is_empty()) 
        {
            return name.clone();
        }

        /* File system path, file created on disk */
        if let Some(file) = info.files.first() {
            if !file.path.is_empty() {
                if let Some(n) = Path::new(&file.path).file_name().and_then(|s| s.to_str()) {
                    return n.to_string();
                }
            }
        }

        /* Parse uri (magnet dn / url path) */
        for file in &info.files {
            for aria_uri in &file.uris {
                if let Ok(u) = Url::parse(&aria_uri.uri) {
                    // Magnet link; try 'dn' parameter
                    if u.scheme() == "magnet" {
                        for (k, v) in u.query_pairs() {
                            if k == "dn" && !v.trim().is_empty() {
                                return v.into_owned();
                            }
                        }
                    }
                    // http/ftp; try path segment
                    else if let Some(s) = u.path_segments().and_then(|seg| seg.last()) {
                        if let Ok(d) = urlencoding::decode(s) {
                            if !d.trim().is_empty() {
                                return d.into_owned();
                            }
                        }
                    }
                }
            }
        }

        error!("failed to resolve name, using '<Untitled>'");
        "<Untitled>".to_string()
    }

    fn skeleton(gid: &str) -> ItemMetaData {
        ItemMetaData {
            gid: gid.to_string(),
            name: Some("<Untitled>".to_string()),
            user_id: 0,
            is_torrent: Some(false),
            status: GidStatus::Waiting,
            total_length: Some("0".into()),
            completed_length: Some("0".into()),
            uploaded_length: Some("0".into()),
            dir: None,
            files: None,
            source_uri: None,
            info_hash: None,
            error_code: None,
            error_message: None,
            created_at: None,
            completed_at: None,
        }
    }
}

/// For registering the history from `add_uris` and `add_torrents_batch`
impl History {
    pub async fn uri_his(
        state: &AppState,
        gid: &str,
        user_id: i64,
    ) -> Result<(), sqlx::Error> {
        // It might be empty, but we pass it to extraction anyway
        let params = vec![serde_json::json!(gid)];
        let json = state.aria2.call("tellStatus", params)
            .await.unwrap_or(serde_json::json!({}));

        // Extract with fallback
        let meta = Extraction::extract(&json, gid);
        debug!("meta from `uri_his`: {:?}", meta);

        // Insert initial record
        Self::insert_initial(&state.db, user_id, &meta).await
    }

    pub async fn torrent_his(
        state: &AppState,
        gid: &str,
        user_id: i64
    ) -> Result<(), sqlx::Error> {
        let params = vec![serde_json::json!(gid)];
        let json = state.aria2.call("tellStatus", params)
            .await.unwrap_or(serde_json::json!({}));
        
        let meta = Extraction::extract(&json, gid);
        Self::insert_initial(&state.db, user_id, &meta).await
    }

    async fn insert_initial(
        pool: &sqlx::SqlitePool,
        user_id: i64,
        meta: &ItemMetaData
    ) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            INSERT INTO download_history (
                gid, user_id, name, status, dir, files, 
                total_length, completed_length, uploaded_length,
                source_uri, info_hash, is_torrent, error_code, error_message,
                created_at, completed_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, NULL)
            ON CONFLICT(gid) DO NOTHING
            "#,
            meta.gid, user_id, meta.name, meta.status, meta.dir, meta.files,
            meta.total_length, meta.completed_length, meta.uploaded_length,
            meta.source_uri, meta.info_hash, meta.is_torrent, meta.error_code, meta.error_message
        )
        .execute(pool)
        .await?;
        Ok(())
    }
}

impl HistoryService {
    pub async fn init(
        state: AppState, 
        mut rx: broadcast::Receiver<Aria2JsonRpcResp>,
    ) {
        Self::sync_init(state.clone()).await;

        // Spawn event listener
        let state_e = state.clone();
        tokio::spawn(async move {
            info!("History event monitor is alive...");
            while let Ok(msg) = rx.recv().await {
                if let Some(method) = msg.method {
                    // on any aria2 event
                    debug!("`listend aria2` event: {:?}", method);
                    if method.starts_with("aria2.on") {
                        let gid = msg.params
                            .as_ref()
                            .and_then(|p| p.first())
                            .and_then(|obj| obj.get("gid")) 
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());

                        if let Some(gid) = gid {
                            debug!("Event '{}' for 'gid' {}", method, gid);
                            Self::refresh_gid(&state_e, gid).await;
                        } else {
                            warn!("Received '{}' event but couldn't extract the gid", method);
                        }
                    }
                }
            }
        });

        // i can't find any better way to avoid using polling, if you're reading this please fix it!!
        // for active ddls
        let state_p = state.clone();
        tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_millis(500));
            loop {
                interval.tick().await;
                Self::tick(&state_p).await;
            }
        });
    }

    async fn tick(state: &AppState) {
        // Get globalStats
        let global_stat = match state.aria2.call("getGlobalStat", vec![]).await {
            Ok(json) => serde_json::from_value::<GlobalStat>(json).unwrap_or_default(),
            Err(_) => return,
        };

        // Get active downloads from db
        let active_rows = sqlx::query!(
        "SELECT gid, user_id FROM download_history WHERE status = 'active'"
        )
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

        if active_rows.is_empty() { 
            // Even if no downloads, send global stats
            debug!("no active ddls, returning generic glob stats");
            // But who to send to? skip or send a generic broadcast.
            return; 
        }

        // Fetch details of gid
        let calls: Vec<serde_json::Value> = active_rows.iter().map(|row| {
            serde_json::json!({ "methodName": "aria2.tellStatus", "params": [row.gid] })
        }).collect();

        if let Ok(response) = state.aria2.call("system.multicall", vec![serde_json::json!(calls)]).await {
            if let Some(results) = response.as_array() {
                // bundle them group result to the `user_id`
                let mut updates_by_user: HashMap<i64, Vec<Aria2Res>> = HashMap::new();

                for (i, result) in results.iter().enumerate() {
                    let user_id = active_rows[i].user_id;
                    if let Some(status_array) = result.as_array() {
                        if let Some(json_obj) = status_array.first() {
                            if let Ok(res) = serde_json::from_value::<Aria2Res>(json_obj.clone()) {
                                updates_by_user.entry(user_id).or_default().push(res.clone());
                                let state_db = state.clone();
                                let gid_ref = active_rows[i].gid.clone();
                                tokio::spawn(async move {
                                    // just upating the progress
                                    Self::update_progress(&state_db, &gid_ref, &res).await;
                                });
                            }
                        }
                    }
                }

                // forward bundles
                for (user_id, tasks) in updates_by_user {
                    let msg = DdlWsMessage::Tick {
                        user_id,
                        global: global_stat.clone(),
                        tasks,
                    };
                    let _ = state.history_tx.send(msg);
                }
            }
        }
    }

    async fn update_progress(state: &AppState, gid: &str, res: &Aria2Res) {
        let file_paths: Vec<String> = res.files.iter()
            .map(|f| f.path.clone())
            .filter(|p| !p.is_empty())
            .collect();
        let files_json = serde_json::to_string(&file_paths).ok();
        let _ = sqlx::query!(
            "UPDATE download_history SET files = ?, completed_length = ?, total_length = ?, uploaded_length = ? WHERE gid = ?",
            files_json, res.completed_length, res.total_length, res.upload_length, gid
        )
            .execute(&state.db)
        .await;
    }

    async fn sync_init(
        state: AppState,
    ) {
        // check every status, anything can be changed
        let incomplete_gids = sqlx::query!(
            "SELECT gid FROM download_history WHERE status IN ('active', 'waiting', 'paused', 'stopped', 'complete', 'error')"
        )
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

        if incomplete_gids.is_empty() {
            info!("No pending downloads to sync");
            return;
        }

        info!("Checking status of {} pending downloads...", incomplete_gids.len());

        /* Batch process in chunks prevent rpc timeout */
        /* Find some way to minimize these hardcoded values  */
        for chunk in incomplete_gids.chunks(100) {
            let calls: Vec<Value> = chunk.iter().map(|row| {
                serde_json::json!({
                    "methodName": "aria2.tellStatus",
                    "params": [row.gid]
                })
            }).collect();

            match state.aria2.call("system.multicall", vec![serde_json::json!(calls)]).await {
                Ok(response) => {
                    if let Some(results) = response.as_array() {
                        for (i, result) in results.iter().enumerate() {
                            let gid = &chunk[i].gid;
                            // Success: result is [ { ...status object... } ]
                            // Error: result is { "errorCode": ... }
                            if let Some(status_array) = result.as_array() {
                                if let Some(status_info) = status_array.first() {
                                    // if gid found. update db with fresh info
                                    debug!("status infos from `sync_init`: {:?}", status_info);
                                    let mut meta = Extraction::extract(status_info, gid);
                                    Self::upsert_db(&state, &mut meta).await;
                                }
                            } else if let Some(error_val) = result.get("error") {
                                // this means it was purged from memory or removed externally
                                // mark it as 'removed' and don't check it again
                                // Fix: delete that prealloc file too
                                let error_code = error_val.get("code").and_then(|v| v.as_i64());
                                match error_code {
                                    Some(1) => {
                                        warn!("gid '{}' not found in aria2 (code 1). marking as error", gid);
                                        let _ = sqlx::query!(
                                            "UPDATE download_history SET status = 'error', error_code = 1, error_message = 'Session lost' WHERE gid = ?", 
                                            gid
                                        ).execute(&state.db).await;
                                    },
                                    Some(code) => {
                                        error!("aria2 error for gid {}: code {}, msg: {:?}", gid, code, error_val.get("message"));
                                    },
                                    None => {
                                        error!("malformed error response for gid {}: {:?}", gid, result);
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => error!("Sync chunk failed: {}", e),
            }
        }
        info!("Sync complete...");
    }

    async fn refresh_gid(
        state: &AppState,
        gid: String, 
    ) {
        info!("refreshing gid: {:?}", gid);
        let params = vec![serde_json::json!(gid)];
        if let Ok(info) = state.aria2.call("tellStatus", params).await {
            let mut meta = Extraction::extract(&info, &gid);
            Self::upsert_db(state, &mut meta).await;
        }
    }

    async fn upsert_db(state: &AppState, meta: &mut ItemMetaData) {
        // name gets insert at the `add_uris` or `add_torrents_batch`
        // FIX: later refactor it
        let res = sqlx::query!(
            r#"
            UPDATE download_history 
            SET 
                name = CASE WHEN ?1 = '<Untitled>' THEN name ELSE COALESCE(?1, name) END,
                status = ?, dir = ?, files = ?, 
                total_length = ?, completed_length = ?, uploaded_length = ?,
                info_hash = ?, is_torrent = ?, error_code = ?, error_message = ?,
                completed_at = CASE WHEN ? = 'complete' THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END,
                updated_at = CURRENT_TIMESTAMP
            WHERE gid = ?
            RETURNING user_id, created_at, completed_at
            "#,
            meta.name, meta.status, meta.dir, meta.files,
            meta.total_length, meta.completed_length, meta.uploaded_length,
            meta.info_hash, meta.is_torrent, meta.error_code, meta.error_message,
            meta.status,
            meta.gid
        )
        .fetch_optional(&state.db)
        .await;
        match res {
            Ok(Some(row)) => {
                meta.user_id = row.user_id;
                meta.created_at = row.created_at;
                meta.completed_at = row.completed_at;
                // send on global channel
                let msg = DdlWsMessage::Event {
                    user_id: row.user_id,
                    data: meta.clone(),
                };
                let _ = state.history_tx.send(msg);
            },
            Ok(None) => {
                warn!("Received aria2 update for unknown gid: {:?}, download: {:?} weird error", meta.gid, meta.name);
            },
            Err(e) => error!("Database update failed: {}", e),
        }
    }
}

pub async fn get_history(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Query(params): Query<PaginationQuery>,
) -> impl IntoResponse {
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20);
    let offset = (page - 1) * limit;

    // 1. Get Total Count
    let total_items = sqlx::query!(
        "SELECT COUNT(*) as count FROM download_history WHERE user_id = ?",
        user.id
    )
    .fetch_one(&state.db)
    .await
    .map(|row| row.count)
    .unwrap_or(0);

    let total_pages = (total_items as f64 / limit as f64).ceil() as u32;

    let history = sqlx::query_as!(
        ItemMetaData,
        r#"
        SELECT 
            gid, 
            name, 
            user_id,
            status as "status: GidStatus", 
            total_length, 
            completed_length, 
            uploaded_length,
            dir,
            files,
            source_uri,
            info_hash,
            error_code,
            error_message,
            is_torrent,
            created_at as "created_at!",
            completed_at as "completed_at"
        FROM download_history 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
        "#,
        user.id,
        limit,
        offset
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    Json(json!({
        "data": history,
        "meta": {
            "currentPage": page,
            "perPage": limit,
            "totalItems": total_items,
            "totalPages": total_pages
        }
    }))
}

#[derive(Deserialize)]
pub struct DeleteHistoryRequest {
    pub gids: Vec<String>,
    pub delete_file: bool,
}

pub async fn delete_history(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Json(payload): Json<DeleteHistoryRequest>,
) -> impl IntoResponse {
    for gid in payload.gids {
        if payload.delete_file {
            let record = sqlx::query!(
                "SELECT dir, name FROM download_history WHERE gid = ? AND user_id = ?", 
                gid, user.id
            )
            .fetch_optional(&state.db)
            .await
            .unwrap_or_default();
            
            if let Some(rec) = record {
                let dir = rec.dir;
                let name = rec.name;

                if !dir.is_empty() && !name.is_empty() {
                    let path = Path::new(&dir).join(&name);
                    let _ = std::fs::remove_dir_all(&path); 
                    let _ = std::fs::remove_file(&path);
                    let _ = std::fs::remove_file(format!("{}.aria2", path.display()));
                }
            }
        }

        /* Ensure `user_id` matches history */
        let _ = sqlx::query!(
            "DELETE FROM download_history WHERE gid = ? AND user_id = ?", 
            gid, user.id
        )
        .execute(&state.db)
        .await;

        // Free aria2 memory
        let _ = state.aria2.call("removeDownloadResult", vec![json!(gid)]).await;
    }

    Json(json!({ "success": true }))
}
