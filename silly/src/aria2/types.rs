use serde_json::Value;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use std::sync::{atomic::{AtomicU64}, Arc };
use tokio::sync::{broadcast, mpsc, oneshot, Mutex};

#[derive(Deserialize, Debug)]
pub struct GidRequest {
    pub gid: String,
}

#[derive(Deserialize, Debug)]
pub struct TorrentItem {
    pub torrent: String,
    #[serde(default)]
    pub options: Option<Value>,
}

/// For batch request 
#[derive(Deserialize, Debug)]
pub struct BatchAddTorrentRequest {
    pub torrents: Vec<TorrentItem>,
}

#[derive(Deserialize, Debug)]
pub struct AddTorrentReq {
    // Base64 encoded file content
    pub torrent: String, 
    pub options: Option<serde_json::Map<String, Value>>,
}

#[derive(Deserialize, Debug)]
pub struct AddUriReq {
    pub uris: Vec<String>,
    pub options: Option<serde_json::Map<String, Value>>,
}


#[derive(Deserialize, Debug)]
pub struct GlobalOptionReq {
    pub options: serde_json::Map<String, Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveReq {
    pub gid: String,
    /// Relative change (+1, -1) or absolute index
    pub pos: i32,   
    /// "POS_SET", "POS_CUR", "POS_END"
    pub how: String, 
}

#[derive(Debug, Clone, Serialize)]
pub struct Aria2JsonRpcReq {
    pub id: String,
    pub jsonrpc: String,
    pub method: String,
    pub params: Vec<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Aria2JsonRpcResp {
    pub id: Option<String>,
    pub method: Option<String>,
    pub params: Option<Vec<Value>>,
    pub result: Option<Value>,
    pub error: Option<Value>,
}

#[derive(Debug)]
pub enum Command {
     Call {
        method: String,
        params: Vec<Value>,
        reply: oneshot::Sender<Result<Value, String>>,
    },
}

#[derive(Clone)]
pub struct Aria2Client {
    pub command_tx: mpsc::Sender<Command>,
    /// Broadcast channel for aria2 events
    pub events: broadcast::Sender<Aria2JsonRpcResp>, 
}

#[derive(Debug)]
pub struct Aria2Worker {
    pub url: String,
    pub secret: Option<String>,
    pub id_counter: AtomicU64,
    /// Maps request id to reply channel
    pub pending_requests: Arc<Mutex<HashMap<String, oneshot::Sender<Result<Value, String>>>>>,
}
