import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const dbPath = process.env.DB_PATH || '/app/data/database.sqlite';
export const db = new sqlite3.Database(dbPath);

// Promisify database methods for easier async/await usage
const dbRun = promisify(db.run.bind(db));

/**
 * Execute a query that doesn't return results (CREATE, INSERT, UPDATE, DELETE)
 */
function executeQuery(query: string, tableName: string): Promise<void> {
	return new Promise((resolve, reject) => {
		db.run(query, (err: Error | null) => {
			if (err) {
				console.error(`✗ Failed to create ${tableName} table:`, err.message);
				reject(err);
			} else {
				console.log(`✓ ${tableName} table ready`);
				resolve();
			}
		});
	});
}

/**
 * Initialize all database tables
 */
export async function initDB(): Promise<void> {
	try {
		await createFriendsTable();
		await createProfilesTable();
		await createIndexes();
		console.log('✓ Interact service database initialization complete');
	} catch (err) {
		console.error('✗ Database initialization failed:', err);
		throw err;
	}
}

/**
 * Create friends table
 */
function createFriendsTable(): Promise<void> {
	const query = `
		CREATE TABLE IF NOT EXISTS friends (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			friend_id INTEGER NOT NULL,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_id, friend_id)
		)
	`;
	return executeQuery(query, 'friends');
}

/**
 * Create user profiles table
 */
function createProfilesTable(): Promise<void> {
	const query = `
		CREATE TABLE IF NOT EXISTS profiles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL UNIQUE,
			bio TEXT,
			avatar_url TEXT,
			status TEXT DEFAULT 'online',
			created_at TEXT DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT DEFAULT CURRENT_TIMESTAMP
		)
	`;
	return executeQuery(query, 'profiles');
}

/**
 * Create database indexes for query optimization
 */
async function createIndexes(): Promise<void> {
	const indexes = [
		'CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id)',
		'CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id)',
		'CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id)'
	];

	for (const indexQuery of indexes) {
		await dbRun(indexQuery);
	}
	console.log('✓ Database indexes created');
}
