import { rejects } from 'assert';
import { resolve } from 'path';
import sqlite3 from 'sqlite3';

const DBSOURCE = "./data/database.sqlite";

sqlite3.verbose();

export const database = new sqlite3.Database(DBSOURCE, (err) => {
	if (err) {
		console.log("Error opening database: ", err.message);
	}
	else {
		console.log("Connected to the database at ", DBSOURCE);
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
				status TEXT NOT NULL
			);
			CREATE TABLE IF NOT EXISTS players (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					auth_user_id INTEGER UNIQUE,
					alias TEXT NOT NULL UNIQUE,
					match_id INTEGER NOT NULL,
					status TEXT,
					remote INTEGER,
					FOREIGN KEY(match_id) REFERENCES matches(id)
			);
			CREATE TABLE IF NOT EXISTS games (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					left_player_id INTEGER,
					right_player_id INTEGER,
					match_id INTEGER NOT NULL,
					FOREIGN KEY(match_id) REFERENCES matches(id)
			);
		`, (err) => {
				if (err) {
					console.error('Failed to create tables:', err.message);
					reject(err);
				} else {
					console.log('tables created or already exist');
					resolve();
				}
			});
		});
	});
}
