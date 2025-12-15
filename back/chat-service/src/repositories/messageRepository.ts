import { db } from '../db/database';

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
}

// ============================================================================
// Message Repository
// ============================================================================

/**
 * Create a new message
 */
export function createMessage(params: CreateMessageParams): Promise<number> {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
            [params.conversationId, params.senderId, params.content],
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
                    resolve(rows.reverse()); // Reverse to get chronological order
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
                    resolve(row || null);
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
                resolve(rows);
            }
        });
    });
}
