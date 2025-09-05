import sqlite3 from "sqlite3";
import path from "path";

// Enables verbose debug output
sqlite3.verbose();

// Path to the "data" directory where the SQLite database will be stored
//const dataDir = path.resolve(__dirname, "../data");
//const dbFile = path.join(dataDir, "auth.sqlite");
const DBSOURCE = "./data/database.sqlite";

// Create connection
export const db = new sqlite3.Database(DBSOURCE, (err) => {
	  if (err) {
		console.error("Failed to open database:", err.message);	
	} else {
		console.log("Connected to SQLite database at", DBSOURCE);
	}
}
);

export function initDB() {
  db.serialize(() => {
		db.run(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			two_factor_secret TEXT,
			two_factor_enabled BOOLEAN DEFAULT 0
		)
    `, (err) => {
	  if (err) {
		console.error('Failed to create "users" table:', err.message);	
		} else {
			console.log('"users" table created or already exists');
		}
	});

    db.run(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `
	, (err) => {	
		 if (err) {
		console.error('Failed to create "refresh_tokens" table:', err.message);	
		} else {
			console.log('"refresh_tokens" table created or already exists');
		} 
	}
	);
	
 });
}
