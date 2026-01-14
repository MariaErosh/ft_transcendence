import { db } from '../db/database';

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert SQLite datetime format to ISO 8601 format
 * SQLite: "YYYY-MM-DD HH:MM:SS" -> ISO: "YYYY-MM-DDTHH:MM:SS.000Z"
 */
function normalizeTimestamp(timestamp: string): string {
    if (!timestamp) return timestamp;
    // If already in ISO format (contains 'T'), return as-is
    if (timestamp.includes('T')) return timestamp;
    // Convert SQLite format to ISO format
    return timestamp.replace(' ', 'T') + '.000Z';
}

/**
 * Normalize message timestamps from database
 */
function normalizeMessage(msg: any): any {
    return {
        ...msg,
        created_at: normalizeTimestamp(msg.created_at),
        read_at: msg.read_at ? normalizeTimestamp(msg.read_at) : null
    };
}

// ============================================================================
// Types
// ============================================================================

export interface Message {
    id: number;
    conversation_id: number;
    sender_id: number;
    content: string;
    created_at: string;
}

export interface CreateMessageParams {
    conversationId: number;
    senderId: number;
    content: string;
	messageType?: string;
	metadata?: string;
}

// ============================================================================
// Message Operations
// ============================================================================

/**
 * Create a new message
 */
export function createMessage(params: CreateMessageParams): Promise<number> {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString();
        db.run(
            'INSERT INTO messages (conversation_id, sender_id, content, message_type, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [
                params.conversationId, 
                params.senderId, 
                params.content,
                params.messageType || 'text',
                params.metadata || null,
                timestamp
            ],
            function(err) {
                if (err) {
                    reject(new Error(`Failed to create message: ${err.message}`));
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
}

/**
 * Get messages by conversation ID
 */
export function getMessagesByConversation(conversationId: number, limit: number = 50): Promise<Message[]> {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM messages
             WHERE conversation_id = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            [conversationId, limit],
            (err: any, rows: any[]) => {
                if (err) {
                    reject(new Error(`Failed to get messages: ${err.message}`));
                } else {
                    const normalized = rows.map(normalizeMessage);
                    resolve(normalized.reverse()); // Reverse to get chronological order
                }
            }
        );
    });
}

/**
 * Get a single message by ID
 */
export function getMessageById(messageId: number): Promise<Message | null> {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM messages WHERE id = ?',
            [messageId],
            (err: any, row: any) => {
                if (err) {
                    reject(new Error(`Failed to get message: ${err.message}`));
                } else {
                    resolve(row ? normalizeMessage(row) : null);
                }
            }
        );
    });
}

/**
 * Delete a message
 */
export function deleteMessage(messageId: number): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM messages WHERE id = ?',
            [messageId],
            (err) => {
                if (err) {
                    reject(new Error(`Failed to delete message: ${err.message}`));
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Get recent messages across all conversations for a user
 */
export function getUserRecentMessages(userId: number, limit: number = 50): Promise<Message[]> {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT m.*
            FROM messages m
            INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE cp.user_id = ?
            ORDER BY m.created_at DESC
            LIMIT ?
        `;

        db.all(query, [userId, limit], (err: any, rows: any[]) => {
            if (err) {
                reject(new Error(`Failed to get user messages: ${err.message}`));
            } else {
                resolve(rows.map(normalizeMessage));
            }
        });
    });
}

export function markMessageAsRead(messageId: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const timestamp = new Date().toISOString();
		const query = `
			UPDATE messages
			SET is_read = 1,
				read_at = ?
			WHERE id = ?
		`;
		db.run(query, [timestamp, messageId], function(err) {
			if (err) {
				reject(new Error(`Failed to mark message as read: ${err.message}`));
			} else {
				resolve();
			}
		});
	});
}

/**
 * Mark all unread messages in a conversation as read for a specific user
 * (conversation-level approach - more efficient)
 */
export function markConversationAsRead(conversationId: number, userId: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const timestamp = new Date().toISOString();
		const query = `
			UPDATE messages
			SET is_read = 1,
				read_at = ?
			WHERE conversation_id = ?
				AND sender_id != ?
				AND is_read = 0
		`;
		db.run(query, [timestamp, conversationId, userId], function(err) {
			if (err) {
				reject(new Error(`Failed to mark conversation as read: ${err.message}`));
			} else {
				resolve();
			}
		});
	});
}
