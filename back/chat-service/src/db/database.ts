import sqlite3 from "sqlite3";
import path from "path";

// Enable verbose debug output
sqlite3.verbose();

// Database file path (from environment or default)
const DBSOURCE = process.env.DATABASE_PATH || "./data/database.sqlite";

// Create database connection
export const db = new sqlite3.Database(DBSOURCE, (err) => {
	if (err) {
		console.error("Failed to open database:", err.message);
	} else {
		console.log("Connected to SQLite database at", DBSOURCE);
	}
});

// Initialize database tables
export function initDB(): Promise<void> {
    return new Promise ((resolve, reject) => {
        db.serialize(() => {
            // Messages table
            db.run(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    username TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                )
            `, (err) => {
                if (err) {
                    console.error('Failed to create "messages" table:', err.message);
                    reject(err);
                } else {
                    console.log('"messages" table created or already exists');
                }
            });

            // Index for faster queries (get recent messages)
            db.run(`
                CREATE INDEX IF NOT EXISTS idx_messages_created 
                ON messages(created_at DESC)
            `, (err) => {
                if (err) {
                    console.error('Failed to create index:', err.message);
                    reject(err);
                } else {
                    console.log('Index idx_messages_created created or already exists');
                    resolve()
                }
            });
        });
    });
}
