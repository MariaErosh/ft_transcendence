import sqlite3 from "sqlite3";
import path from "path";

// Enables verbose debug output
sqlite3.verbose();

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
  			auth_user_id INTEGER UNIQUE,
  			username TEXT,
  			email TEXT UNIQUE,
  			created_at TEXT DEFAULT CURRENT_TIMESTAMP

		)
    `, (err) => {
	  if (err) {
		console.error('Failed to create "users" table:', err.message);
		} else {
			console.log('"users" table created or already exists');
		}
	});

	db.run(`ALTER TABLE users ADD COLUMN games_played INTEGER DEFAULT 0`, [], (err2) => {
		if (err2 && !err2.message.includes("duplicate column name")) {
			console.error("Failed to add column 'games_played':", err2.message);
		}
    });

	db.run(`ALTER TABLE users ADD COLUMN games_won INTEGER DEFAULT 0`, [], (err3) => {
		if (err3 && !err3.message.includes("duplicate column name")) {
			 console.error("Failed to add column 'games_won':", err3.message);
		}
	});
	
 });
}
