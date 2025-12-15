import sqlite3 from "sqlite3";
import path from "path";
import pino from "pino";

const logger = pino({
	level: 'info',
	transport: {
		targets: [
			{ target: 'pino/file', options: { destination: 1 } },
			{
				target: 'pino-socket',
				options: { address: 'logstash', port: 5000, mode: 'tcp', reconnect: true }
			}
		]
	}
});

// Enables verbose debug output
sqlite3.verbose();

const DBSOURCE = "./data/database.sqlite";

// Create connection
export const db = new sqlite3.Database(DBSOURCE, (err) => {
	  if (err) {
		logger.error({ err }, "Failed to open database");
	} else {
		logger.info(`Connected to SQLite database at ${DBSOURCE}`);
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
		logger.error({ err }, 'Failed to create "users" table');
		} else {
			logger.info('"users" table created or already exists');
		}
	});

	db.run(`ALTER TABLE users ADD COLUMN games_played INTEGER DEFAULT 0`, [], (err2) => {
		if (err2 && !err2.message.includes("duplicate column name")) {
			logger.error({ err: err2 }, "Failed to add column 'games_played'");
		}
    });

	db.run(`ALTER TABLE users ADD COLUMN games_won INTEGER DEFAULT 0`, [], (err3) => {
		if (err3 && !err3.message.includes("duplicate column name")) {
			 logger.error({ err: err3 }, "Failed to add column 'games_won'");
		}
	});

 });
}
