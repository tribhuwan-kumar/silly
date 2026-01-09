use tracing::info;
use std::path::Path;
use std::str::FromStr;
use sqlx::{
    Pool, Sqlite,
    sqlite::{
        SqliteJournalMode,
        SqlitePoolOptions,
        SqliteConnectOptions,
    },
};

pub async fn init_db(data_dir: &Path) -> Result<Pool<Sqlite>, sqlx::Error> {
    let db_path = data_dir.join("silly.db");
    if !db_path.exists() {
        std::fs::File::create(&db_path)?;
    }

    let db_url = format!("sqlite://{}?mode=rwc", db_path.to_string_lossy());

    let conc_options = SqliteConnectOptions::from_str(&db_url)?
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .foreign_keys(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(conc_options)
        .await?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;
    
    info!("Database initialized successfully! (WAL mode, Foreign keys enabled)");

    Ok(pool)
}

// Check if an Admin account exists.
pub async fn admin_exists(pool: &Pool<Sqlite>) -> Result<bool, sqlx::Error> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users WHERE role = 'admin'")
        .fetch_one(pool)
        .await?;
    
    Ok(count.0 != 0)
}
