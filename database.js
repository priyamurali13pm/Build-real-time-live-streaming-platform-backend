const Database = require("better-sqlite3");

// Create or open the SQLite database
const db = new Database("twitcasting.db");

// Enable foreign key support
db.pragma("foreign_keys = ON");

// Create Users table
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Create Streams table
db.exec(`
    CREATE TABLE IF NOT EXISTS streams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        category TEXT,
        media_path TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'offline',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    )
`);

console.log("✅ SQLite database connected");

module.exports = db;