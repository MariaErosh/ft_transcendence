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

// Path to the "data" directory where the SQLite database will be stored
//const dataDir = path.resolve(__dirname, "../data");
//const dbFile = path.join(dataDir, "auth.sqlite");
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
			username TEXT UNIQUE NOT NULL,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			two_factor_secret TEXT,
			two_factor_enabled BOOLEAN DEFAULT 0
		)
    `, (err) => {
	  if (err) {
		logger.error({ err }, 'Failed to create "users" table');
		} else {
			logger.info('"users" table created or already exists');
		}
	});

	db.run(`
		CREATE TABLE IF NOT EXISTS refresh_tokens (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			token_hash TEXT NOT NULL,
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		);
		`
		, (err) => {
			if (err) {
			logger.error({ err }, 'Failed to create "refresh_tokens" table');
			} else {
				logger.info('"refresh_tokens" table created or already exists');
			}
		}
	);

	db.run(`
		CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
		`
		, (err) => {
			if (err) {
			logger.error({ err }, 'Failed to create index');
			} else {
				logger.info('Index idx_refresh_tokens_user_id created or already exist');
			}
		}
	);
 });
}
