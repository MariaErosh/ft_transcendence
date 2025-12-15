import { rejects } from 'assert';
import { resolve } from 'path';
import sqlite3 from 'sqlite3';
import pino from 'pino';

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

const DBSOURCE = "./data/database.sqlite";

sqlite3.verbose();

export const database = new sqlite3.Database(DBSOURCE, (err) => {
	if (err) {
		logger.error({ err }, "Error opening database");
	}
	else {
		logger.info(`Connected to the database at ${DBSOURCE}`);
	}
})

export function initDB(db: sqlite3.Database = database): Promise<void> {
	return new Promise((resolve, reject) => {
		db.serialize(() => {
			db.exec(`
			DROP TABLE IF EXISTS games;
			DROP TABLE IF EXISTS players;
			DROP TABLE IF EXISTS matches;
			CREATE TABLE IF NOT EXISTS matches (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT,
				status TEXT NOT NULL,
				type TEXT NOT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				round INTEGER,
				owner TEXT
			);
			CREATE TABLE IF NOT EXISTS players (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					user_id INTEGER,
					alias TEXT NOT NULL,
					match_id INTEGER NOT NULL,
					status TEXT,
					FOREIGN KEY(match_id) REFERENCES matches(id)
			);
			CREATE TABLE IF NOT EXISTS games (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					left_player_id INTEGER,
					left_player_alias TEXT NOT NULL,
					right_player_id INTEGER,
					right_player_alias TEXT NOT NULL,
					match_id INTEGER NOT NULL,
					round INTEGER NOT NULL,
					type TEXT NOT NULL,
					status TEXT NOT NULL,
					winner TEXT,
					loser TEXT,
					owner TEXT,
					FOREIGN KEY(match_id) REFERENCES matches(id)
			);
		`, (err) => {
				if (err) {
					logger.error({ err }, 'Failed to create tables');
					reject(err);
				} else {
					logger.info('tables created or already exist');
					resolve();
				}
			});
		});
	});
}
