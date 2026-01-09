use clap::Parser;
use std::path::PathBuf;

/// Inlcude random letters as short so they don't look unaligned :'(
#[derive(Parser, Debug, Clone)]
#[command(author, version, about, long_about = None)]
pub struct Args {
    /// Port to serve the Web UI and API
    #[arg(short, long, default_value_t = 8080)]
    pub port: u16,

    /// Host to bind the server to
    #[arg(short='a', long, default_value = "0.0.0.0")]
    pub host: String,

    /// Aria2 RPC Host (Websocket preferred, use wss for SSL)
    #[arg(short='x', long, default_value = "ws://127.0.0.1")]
    pub aria2_host: String,

    /// Aria2 RPC Port
    #[arg(short='y', long, default_value = "6800")]
    pub aria2_port: String,

    /// Aria2 RPC Secret Token
    #[arg(short='m', long, env = "ARIA2_SECRET")]
    pub aria2_secret: Option<String>,

    /// Directory to store application data
    #[arg(short='o', long, default_value = "silly")]
    pub data_dir: PathBuf,

    /// Enable verbose logging
    #[arg(short='l', long)]
    pub verbose: bool,

    /// Path to an SSL/TLS certificate to serve with HTTPS
    #[arg(short='c', long, env = "SILLY_SSL_CERT")]
    pub ssl: Option<PathBuf>,

    /// JWT secret, Optional but only be define in enviroment variable
    #[arg(short='j', long, env = "SILLY_JWT_SECRET", hide_env_values = false)]
    pub jwt_secret: Option<String>,
}

