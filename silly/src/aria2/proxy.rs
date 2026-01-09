use axum::{
    extract::Json,
    extract::{State},
    http::StatusCode,
    response::{IntoResponse},
};
use serde_json::{json, Value};
use super::types::{
    GidRequest,
    MoveReq,
    AddUriReq,
    AddTorrentReq,
    GlobalOptionReq,
    BatchAddTorrentRequest,
};
use tracing::{info, debug, error};
use crate::{
    app::AppState,
    his::History,
    auth::types::AuthenticatedUser
}; 

/// Add all most all types of URIs
pub async fn add_uris(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Json(payload): Json<AddUriReq>,
) -> impl IntoResponse {
    /* 
      * Convert list of URIs into a Batch Multicall 
      * addUri([a,b,c]), do [addUri(a), addUri(b), addUri(c)]
    */
    let options = Value::Object(payload.options.unwrap_or_default());
    let calls: Vec<Value> = payload.uris.clone().into_iter().map(|uri| {
        json!({
            "methodName": "aria2.addUri",
            "params": [
                [uri],          /* addUri expects an array of mirrors, so wrap single uri in [] */
                options.clone()
            ]
        })
    }).collect();

    debug!("add uri calls: {:?}", calls);

    let mc_params = vec![json!(calls)];
    match state.aria2.call("system.multicall", mc_params).await {
        Ok(gids) => {
            info!("addind gids: {:?}", gids);
            if let Some(arr) = gids.as_array() {
                for (i, res) in arr.iter().enumerate() {
                    let gid = res.as_array()
                        .and_then(|g| g.first())
                        .and_then(|v| v.as_str());
                    if let Some(gid) = gid {
                        info!("gid: {:?}", gid);
                        let source_uri = payload.uris.get(i).cloned().unwrap_or_default();
                        /* FIX: spawn later, await is okay now */
                        if let Err(e) = History::uri_his(&state, gid, user.id, &source_uri).await {
                            error!("Failed to create history for user {}, role {}: {}", user.username, user.role, e);
                        }
                    }
                }
            }
            info!("`add_uri` Successfully executed multicall: {}", gids);
            (StatusCode::OK, Json(json!({ "results":  gids })))
        },
        Err(e) => {
            error!("Failed to add uri: {}", e);
            (StatusCode::BAD_GATEWAY, Json(json!({ "error": e })))
        }
    }
}


/// Add a torrent file
/// Ref: https://aria2.github.io/manual/en/html/aria2c.html#aria2.addTorrent
#[deprecated(note = "Please use `add_torrents` instead")]
pub async fn add_torrent(
    State(state): State<AppState>,
    Json(payload): Json<AddTorrentReq>,
) -> impl IntoResponse {
    let options = Value::Object(payload.options.unwrap_or_default());
    /* 
      *  The empty array is for web seeding URIs,
      *  They're usually empty
    */
    // Params: [base64_torrent, [], options]
    let params = vec![
        json!(payload.torrent), 
        json!([]), 
        options
    ];

    match state.aria2.call("addTorrent", params).await {
        Ok(gid) => {
            info!("`add_torrent` Successfully executed multicall: {}", gid);
            (StatusCode::OK, Json(json!({ "gid": gid })))
        },
        Err(e) => {
            error!("`add_torrent` Failed to executed multicall: {}", e);
            (StatusCode::BAD_GATEWAY, Json(json!({ "error": e })))
        }
    }
}

/// Specially for adding torrents files
pub async fn add_torrents(
    State(state): State<AppState>,
    user: AuthenticatedUser,
    Json(payload): Json<BatchAddTorrentRequest>,
) -> impl IntoResponse {
    if payload.torrents.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": "No torrents provided" })));
    }
    /*
        Build the multicall params
        Transform list of inputs into a list of aria2 method calls
    */
    let calls: Vec<Value> = payload.torrents.into_iter().map(|item| {
        let options = item.options.unwrap_or_else(|| json!({}));
        json!({
            "methodName": "aria2.addTorrent",
            "params": [
                item.torrent,
                [],             /* Webseeding URIs, keeping it empty till now */
                options
            ]
        })
    }).collect();

    /* 
        Call system.multicall
        Params for multicall is an array containing the array of calls: [ [call1, call2] ]
    */
    let mc_params = vec![json!(calls)];
    match state.aria2.call("system.multicall", mc_params).await {
        Ok(gids) => { 
            if let Some(arr) = gids.as_array() {
                for res in arr {
                    let gid = res.as_array()
                        .and_then(|g| g.first())
                        .and_then(|v| v.as_str());

                    if let Some(gid) = gid {
                        if let Err(e) = History::torrent_his(&state, gid, user.id).await {
                            error!("Failed to create history for user {}, role {}: {}", user.username, user.role, e);
                        }
                    }
                }
            }
            info!("`add_torrents_batch` Successfully executed multicall: {}", gids);
            (StatusCode::OK, Json(json!({ "results": gids })))
        }
        Err(e) => { 
            error!("`add_torrents_batch` Failed to batch torrents: {}", e);
            (StatusCode::BAD_GATEWAY, Json(json!({ "error": e })))
        }
    }
}

/// Later maybe use `forcePause`!?
/// Ref: https://aria2.github.io/manual/en/html/aria2c.html#aria2.forcePause
pub async fn pause_download(
    State(state): State<AppState>,
    Json(payload): Json<GidRequest>,
) -> impl IntoResponse {

    match state.aria2.call("pause", vec![json!(payload.gid)]).await {
        Ok(_) => {
            info!("`pause_download` Pause gid: {:?}", payload.gid);
            (StatusCode::OK, Json(json!({ "status": "paused" })))
        },
        Err(e) => {
            error!("`pause_download` Failed to pause gid: {:?}", payload.gid);
            (StatusCode::BAD_GATEWAY, Json(json!({ "error": e })))
        },
    }
}

/// Resume downloads `--continue` arg
pub async fn resume_download(
    State(state): State<AppState>,
    Json(payload): Json<GidRequest>,
) -> impl IntoResponse {
    match state.aria2.call("unpause", vec![json!(payload.gid)]).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "status": "resumed" }))),
        Err(e) => (StatusCode::BAD_GATEWAY, Json(json!({ "error": e }))),
    }
}

/// Removing downloads, might later delete that file too!?
pub async fn remove_download(
    State(state): State<AppState>,
    Json(payload): Json<GidRequest>,
) -> impl IntoResponse {
    // Usually we want 'forceRemove' + 'removeDownloadResult'
    // But for basic API, let's just forceRemove
    match state.aria2.call("forceRemove", vec![json!(payload.gid)]).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "status": "removed" }))),
        Err(e) => (StatusCode::BAD_GATEWAY, Json(json!({ "error": e }))),
    }
}

pub async fn get_details(
    State(state): State<AppState>,
    Json(payload): Json<GidRequest>,
) -> impl IntoResponse {
    let params = vec![json!([
        { "methodName": "aria2.getFiles", "params": [payload.gid.clone()] },
        { "methodName": "aria2.getPeers", "params": [payload.gid.clone()] },
        { "methodName": "aria2.getServers", "params": [payload.gid.clone()] }
    ])];

    match state.aria2.call("system.multicall", params).await {
        Ok(res) => (StatusCode::OK, Json(res)),
        Err(e) => (StatusCode::BAD_GATEWAY, Json(json!({ "error": e }))),
    }
}

pub async fn purge_results(State(state): State<AppState>) -> impl IntoResponse {
    match state.aria2.call("purgeDownloadResult", vec![]).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "status": "purged" }))),
        Err(e) => (StatusCode::BAD_GATEWAY, Json(json!({ "error": e }))),
    }
}

pub async fn move_position(
    State(state): State<AppState>,
    Json(payload): Json<MoveReq>,
) -> impl IntoResponse {
    let params = vec![
        json!(payload.gid),
        json!(payload.pos),
        json!(payload.how)
    ];

    state.aria2.call("changePosition", params)
        .await
        .inspect(|res| info!("Successfully executed multicall: {:?}", res))
        .inspect_err(|e| info!("failed to add uri: {:?}", e))
        .map(|results| (StatusCode::OK, Json(json!({ "newPosition": results }))))
        .unwrap_or_else(|e| (StatusCode::BAD_GATEWAY, Json(json!({ "error": e.to_string() }))))
}

pub async fn change_global_option(
    State(state): State<AppState>,
    Json(payload): Json<GlobalOptionReq>,
) -> impl IntoResponse {
    let params = vec![json!(payload.options)];

    match state.aria2.call("changeGlobalOption", params).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "status": "ok" }))),
        Err(e) => (StatusCode::BAD_GATEWAY, Json(json!({ "error": e }))),
    }
}
