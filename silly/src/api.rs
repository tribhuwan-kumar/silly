use serde::Serialize;
use axum::{
    Router,
    middleware,
    routing::{get, post, delete},
    response::{IntoResponse, Response},
    extract::{
        State, ws,
        ws::{WebSocket, WebSocketUpgrade, Message},
    },
};
use tower_http::cors::CorsLayer;
use tracing::{debug};

use crate::{web, api, his, his::DdlWsMessage, aria2, auth, app::AppState, auth::types::AuthenticatedUser}; 

#[derive(Serialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SysStatus {
    pub version: String,
    pub admin_exists: bool,
    pub aria2_alive: bool,
}

pub async fn status_ws(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| sys_status(socket, state))
}

pub async fn sys_status(
    mut socket: WebSocket, 
    state: AppState 
) {
    let mut rx = state.status_tx.subscribe();

    let init = {
        let current = rx.borrow();
        serde_json::to_string(&*current).unwrap()
    };

    if socket.send(Message::Text(init.into())).await.is_err() {
        return;
    }

    while rx.changed().await.is_ok() {
        let status = rx.borrow_and_update().clone(); 
        let json = serde_json::to_string(&status).unwrap();
        if socket.send(Message::Text(json.into())).await.is_err() {
            break;
        }
    }
}

/// Event ws handler
async fn event_ws(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> Response {
    ws.on_upgrade(|socket| event(socket, state))
}

/// Handle events
async fn event(
    mut socket: WebSocket,
    state: AppState
) {
    let mut rx = state.aria2.events.subscribe();
    
    while let Ok(msg) = rx.recv().await {
        // Broadcast the aria2 events
        let json_text = serde_json::to_string(&msg).unwrap_or_default();
        if socket.send(ws::Message::Text(json_text.into())).await.is_err() {
            break;
        }
    }
}

pub async fn history_ws(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    user: AuthenticatedUser,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| history(socket, state, user))
}

async fn history(
    mut socket: WebSocket, 
    state: AppState, 
    user: AuthenticatedUser
) {
    let mut rx = state.history_tx.subscribe();
    while let Ok(msg) = rx.recv().await {
        debug!("`history ws` metadata: {:?}", msg);
        match msg {
            DdlWsMessage::Tick { user_id, global, tasks } => {
                if user_id == user.id {
                    let json = serde_json::json!({
                        "type": "tick",
                        "global": global,
                        "tasks": tasks
                    });
                    if socket.send(
                        Message::Text(json.to_string().into())
                    ).await.is_err() { break; }
                }
            },
            DdlWsMessage::Event { user_id, data } => {
                if user_id == user.id {
                    let json = serde_json::json!({
                        "type": "event",
                        "data": data
                    });
                    if socket.send(
                        Message::Text(json.to_string().into())
                    ).await.is_err() { break; }
                }
            }
        }
    }
}

/// Api routes
#[allow(deprecated)] 
pub fn routes(state: AppState) -> Router {
    Router::new()
        .nest("/api/auth", Router::new()
            .route("/me", get(auth::handler::get_me))
            .route("/login", post(auth::handler::login))
            .route("/logout", post(auth::handler::logout))
            .route("/reg/admin", post(auth::handler::reg_admin))
            .route("/user/create", post(auth::handler::create_user))
            .route("/user/delete", post(auth::handler::delete_user))
            .route("/user/dl/history", get(his::get_history))
            .route("/user/dl/history/delete", delete(his::delete_history))
            .route("/user/dl/history/purge", delete(his::delete_history))
        )
        
        .nest("/api/aria2", Router::new()
            .route("/add", post(aria2::proxy::add_uris))
            .route("/add/torrent", post(aria2::proxy::add_torrent))
            .route("/add/torrents", post(aria2::proxy::add_torrents))
            .route("/pause", post(aria2::proxy::pause_download))
            .route("/resume", post(aria2::proxy::resume_download))
            .route("/remove", post(aria2::proxy::remove_download))
            .route("/details", post(aria2::proxy::get_details))
            .route("/purge", post(aria2::proxy::purge_results))
            .route("/move", post(aria2::proxy::move_position))
            .route("/global", post(aria2::proxy::change_global_option))
            .layer(
                middleware::from_fn_with_state(state.clone(),
                crate::middleware::auth_guard)
            )
        )
        /* Websockets */ 
        .route("/api/ws/event", get(api::event_ws))
        .route("/api/ws/dl/history", get(api::history_ws))
        .route("/api/ws/silly/status", get(api::status_ws))
        .fallback(web::static_handler)
        .layer(CorsLayer::permissive()) // FIX: later fix this
        .with_state(state)
}
