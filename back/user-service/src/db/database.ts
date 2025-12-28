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
  			auth_user_id INTEGER NOT NULL UNIQUE,
  			username TEXT NOT NULL UNIQUE,
  			email TEXT NOT NULL UNIQUE,
			games_played INTEGER NOT NULL DEFAULT 0,
  			games_won INTEGER NOT NULL DEFAULT 0,
  			created_at TEXT DEFAULT CURRENT_TIMESTAMP

		)
    `, (err) => {
	  if (err) {
		logger.error({ err }, 'Failed to create "users" table');
		} else {
			logger.info('"users" table created or already exists');
		}
	});

 });
}
