		import sqlite3 from 'sqlite3';

		const DBSOURCE = "./data/database.sqlite";

		sqlite3.verbose();
		
		export const db = new sqlite3.Database(DBSOURCE, (err) => {
			if (err){
				console.log("Error opening database: ", err.message);
			}
			else{
				console.log("Connected to the database at ", DBSOURCE);
			}
		})

		export function initDB() {
			db.serialize(() => {
				db.run(`
				CREATE TABLE IF NOT EXISTS players (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						auth_user_id INTEGER UNIQUE,
						alias TEXT NOT NULL,
						match_id INTEGER UNIQUE NOT NULL,
						game_result TEXT,
						remote INTEGER
				);
				CREATE TABLE IF NOT EXISTS games (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						left_player_id INTEGER UNIQUE,
						right_player_id INTEGER UNIQUE,
						match_id INTEGER UNIQUE NOT NULL
				);
				CREATE TABLE IF NOT EXISTS matches (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						status TEXT NOT NULL
				)
			`, (err) => {
				if (err) {
				console.error('Failed to create tables:', err.message);	
				} else {
					console.log('tables created or already exist');
				}
			});
		
			
		});
		}
