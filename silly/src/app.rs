use std::sync::Arc;
use tokio::sync::watch;
use tokio::sync::broadcast;
use sqlx::{Pool, Sqlite};

use crate::{
    his::DdlWsMessage,
    api::SysStatus,
    aria2::types::Aria2Client,
};

#[derive(Clone)]
pub struct AppState {
    pub db: Pool<Sqlite>,
    pub aria2: Arc<Aria2Client>,
    pub jwt_secret: String,
    pub status_tx: Arc<watch::Sender<SysStatus>>,
    pub history_tx: Arc<broadcast::Sender<DdlWsMessage>>,
}
