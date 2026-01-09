-- USERS
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'user')) DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API KEYS
-- Maybe in future integrate with Radarr :?
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    label TEXT NOT NULL,                                                -- "Radarr or Sonarr"
    key_hash TEXT NOT NULL,                                             -- Hashed API key
    prefix TEXT NOT NULL,                                               -- First 4 chars to display
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- DOWNLOAD HISTORY
CREATE TABLE IF NOT EXISTS download_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gid TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL,                                               -- 'active', 'complete', 'error', 'removed', 'paused', 'waiting'
    dir TEXT NOT NULL,                                                  -- The directory
    files TEXT,                                                         -- Json array of file paths
    total_length TEXT,                                      
    user_id INTEGER NOT NULL, 
    completed_length TEXT,
    uploaded_length TEXT,                                               -- For torrents seeding
    info_hash TEXT,                                                     -- Hex string for torrent identification
    source_uri TEXT,                                                    -- The uri to perform retries
    error_code INTEGER,
    error_message TEXT,
    is_torrent BOOLEAN NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- GLOBAL SETTINGS
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SOME INDEXES
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_history_user ON download_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_gid ON download_history(gid);
CREATE INDEX IF NOT EXISTS idx_history_hash ON download_history(info_hash);
