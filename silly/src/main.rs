use rand::Rng;
use cli::Args;
use clap::Parser;
use std::sync::Arc;
use tokio::sync::watch;
use std::time::Duration;
use tokio::sync::broadcast;
use tokio::net::TcpListener;
use tracing::{info, error, warn};

mod db;
mod cli;
mod web;
mod api;
mod app;
mod auth;
mod his;
mod logs;
mod aria2;
mod addrs;
mod middleware;

use crate::{
    app::AppState,
    api::SysStatus,
    his::HistoryService,
    aria2::types::Aria2Client,
    db::{init_db, admin_exists},
};


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let args = Args::parse();
    let _log_guard = logs::init_logging(args.clone())?;

    let (resp_tx, _resp_rx) = broadcast::channel(100);
    let (history_tx_rw, _) = broadcast::channel(100);

    if !args.data_dir.exists() {
        info!("Creating data directory at {:?}", args.data_dir);
        std::fs::create_dir_all(&args.data_dir)?;
    }

    let aria2_url = format!("{}:{}/jsonrpc", args.aria2_host, args.aria2_port);

    // Generate a random 32-char secret if not provided
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| {
        rand::rng()
            .sample_iter(&rand::distr::Alphanumeric)
            .take(32)
            .map(char::from)
            .collect()
    });

    let db_pool = init_db(&args.data_dir).await?;

    let admin_exists = admin_exists(&db_pool).await?;
    
    let initial_status = SysStatus {
        version: env!("CARGO_PKG_VERSION").to_string(),
        admin_exists,
        aria2_alive: false,
    };

    let (status_tx, _status_rx) = watch::channel(initial_status);
    let status_tx = Arc::new(status_tx);

    let aria2_client = Aria2Client::new(
        aria2_url.clone(),
        args.aria2_secret.clone(),
        status_tx.clone(),
        resp_tx.clone()
    );

    let state = AppState { 
        db: db_pool.clone(),
        jwt_secret: jwt_secret,
        status_tx: status_tx,
        aria2: Arc::new(aria2_client.clone()),
        history_tx: Arc::new(history_tx_rw),
    };

    info!("Starting history service");
    
    HistoryService::init(state.clone(), resp_tx.subscribe()).await;


    if !admin_exists {
        warn!("Initializing database: No users found");
        info!("Open the web ui and register for admin");
    } else {
        info!("Database is initialized");
    }

    // ignore ipv6
    let (ipv4_addrs, _ipv6_addrs) = addrs::interface_addrs()?;
    let all_addrs = [ipv4_addrs].concat();
    let addrs_listens = addrs::print_listening(&args, &all_addrs)?;

    info!("{}", addrs_listens);
    info!("Silly version: '{}'", env!("CARGO_PKG_VERSION"));
    info!("Data directory: '{}'", args.data_dir.to_string_lossy());

    if args.aria2_secret.is_some() {
        info!("Aria2 secret token loaded");
    } else {
        error!("No secret token provided, aria2 might reject connections");
    }

    let client_clone = aria2_client.clone();
    tokio::spawn(async move {
        tokio::time::sleep(Duration::from_secs(1)).await;
        match client_clone.call("getVersion", vec![]).await {
            Ok(v) => info!("Aria2 version: {}", v),
            Err(e) => warn!("Could not get Aria2 version: {}", e),
        }
    });

    let app = api::routes(state);
    let addr = format!("{}:{}", args.host, args.port);
    let listener = TcpListener::bind(&addr).await?;
    tokio::select! {
        result = axum::serve(listener, app) => {
            if let Err(e) = result {
                error!("Server error: {}", e);
            }
        }
        _ = tokio::signal::ctrl_c() => {
            info!("Ctrl+C received, shutting down...");
        }
    }

    Ok(())
}

