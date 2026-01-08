import sqlite3 from "sqlite3";

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

// ============================================================================
// Error Handling Helper
// ============================================================================

/**
 * Execute a database query with proper error handling
 * @param query SQL query to execute
 * @param tableName Name of the table for logging purposes
 * @returns Promise that resolves when query succeeds
 */
function executeQuery(query: string, tableName: string): Promise<void> {
	return new Promise((resolve, reject) => {
		db.run(query, (err) => {
			if (err) {
				console.error(`Failed to create "${tableName}":`, err.message);
				reject(new Error(`Database error in ${tableName}: ${err.message}`));
			} else {
				console.log(`"${tableName}" created or already exists`);
				resolve();
			}
		});
	});
}

// ============================================================================
// Database Initialization
// ============================================================================

/**
 * Initialize all database tables and indexes
 */
export async function initDB(): Promise<void> {
	try {
		await createConversationsTable();
		await createConversationParticipantsTable();
		await createMessagesTable();
		await createGameInvitationsTable();
		await createNotificationsTable();
		await createBlocksTable();
		await createIndexes();
		console.log('✓ Database initialization complete');
	} catch (err) {
		console.error('✗ Database initialization failed:', err);
		throw err;
	}
}

// ============================================================================
// Table Creation Functions
// ============================================================================

function createConversationsTable(): Promise<void> {
	const query = `
		CREATE TABLE IF NOT EXISTS conversations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP
		)
	`;
	return executeQuery(query, 'conversations');
}

function createConversationParticipantsTable(): Promise<void> {
	const query = `
		CREATE TABLE IF NOT EXISTS conversation_participants (
			conversation_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
			PRIMARY KEY (conversation_id, user_id)
		)
	`;
	return executeQuery(query, 'conversation_participants');
}

function createMessagesTable(): Promise<void> {
	const query = `
		CREATE TABLE IF NOT EXISTS messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			conversation_id INTEGER NOT NULL,
			sender_id INTEGER NOT NULL,
			content TEXT NOT NULL,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP,
			is_read INTEGER DEFAULT 0,
			read_at TEXT
		)
	`;
	return executeQuery(query, 'messages');
}

function createGameInvitationsTable(): Promise<void> {
	const query = `
		CREATE TABLE IF NOT EXISTS game_invitations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sender_id INTEGER NOT NULL,
			receiver_id INTEGER NOT NULL,
			status TEXT CHECK(status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
			created_at TEXT DEFAULT CURRENT_TIMESTAMP
		)
	`;
	return executeQuery(query, 'game_invitations');
}

function createNotificationsTable(): Promise<void> {
	const query = `
		CREATE TABLE IF NOT EXISTS notifications (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			type TEXT NOT NULL,
			payload TEXT NOT NULL,
			is_read INTEGER DEFAULT 0,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP
		)
	`;
	return executeQuery(query, 'notifications');
}

function createBlocksTable(): Promise<void> {
	const query = `
		CREATE TABLE IF NOT EXISTS blocks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			blocker_id INTEGER NOT NULL,
			blocked_id INTEGER NOT NULL,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(blocker_id, blocked_id)
		)
	`;
	return executeQuery(query, 'blocks');
}

// ============================================================================
// Index Creation
// ============================================================================

/**
 * Create all database indexes for query optimization
 * Indexes speed up WHERE, JOIN, and ORDER BY operations
 */
async function createIndexes(): Promise<void> {
	const indexes = [
		{ query: 'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)', name: 'idx_messages_conversation_id' },
		{ query: 'CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)', name: 'idx_messages_sender_id' },
		{ query: 'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC)', name: 'idx_messages_created_at' },
		{ query: 'CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id)', name: 'idx_conversation_participants_user' },
		{ query: 'CREATE INDEX IF NOT EXISTS idx_game_invitations_sender ON game_invitations(sender_id)', name: 'idx_game_invitations_sender' },
		{ query: 'CREATE INDEX IF NOT EXISTS idx_game_invitations_receiver ON game_invitations(receiver_id)', name: 'idx_game_invitations_receiver' },
		{ query: 'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)', name: 'idx_notifications_user' },
		{ query: 'CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read)', name: 'idx_notifications_unread' },
		{ query: 'CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id)', name: 'idx_blocks_blocker' },
		{ query: 'CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id)', name: 'idx_blocks_blocked' }
	];

	try {
		for (const index of indexes) {
			await executeQuery(index.query, `index: ${index.name}`);
		}
		console.log(`✓ All ${indexes.length} indexes created successfully`);
	} catch (err) {
		console.error('Failed to create indexes:', err);
		throw err;
	}
}