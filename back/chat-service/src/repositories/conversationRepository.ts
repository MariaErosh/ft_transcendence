import { db } from '../db/database';

// ============================================================================
// Types
// ============================================================================

export interface Conversation {
    id: number;
    created_at: string;
}

export interface ConversationWithParticipants extends Conversation {
    participants: number[];
}

// ============================================================================
// Conversation Repository
// ============================================================================

/**
 * Create a new conversation
 */
export function createConversation(): Promise<number> {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO conversations DEFAULT VALUES',
            function(err) {
                if (err) {
                    reject(new Error(`Failed to create conversation: ${err.message}`));
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
}

/**
 * Add a participant to a conversation
 */
export function addParticipant(conversationId: number, userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)',
            [conversationId, userId],
            (err) => {
                if (err) {
                    reject(new Error(`Failed to add participant: ${err.message}`));
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Find conversation between two users
 */
export function findConversationBetweenUsers(userId1: number, userId2: number): Promise<number | null> {
    return new Promise((resolve, reject) => {
        // Find conversations where both users are participants and there are exactly 2 participants total
        const query = `
            SELECT cp1.conversation_id
            FROM conversation_participants cp1
            INNER JOIN conversation_participants cp2
                ON cp1.conversation_id = cp2.conversation_id
            WHERE cp1.user_id = ?
                AND cp2.user_id = ?
                AND cp1.conversation_id IN (
                    SELECT conversation_id
                    FROM conversation_participants
                    GROUP BY conversation_id
                    HAVING COUNT(*) = 2
                )
            LIMIT 1
        `;

        db.get(query, [userId1, userId2], (err: any, row: any) => {
            if (err) {
                console.log(`Error finding conversation between ${userId1} and ${userId2}:`, err);
                reject(new Error(`Failed to find conversation: ${err.message}`));
            } else {
                console.log(`findConversationBetweenUsers(${userId1}, ${userId2}):`, row ? row.conversation_id : null);
                resolve(row ? row.conversation_id : null);
            }
        });
    });
}

/**
 * Get or create conversation between two users
 */
export async function getOrCreateConversation(userId1: number, userId2: number): Promise<number> {
    const existingConversationId = await findConversationBetweenUsers(userId1, userId2);

    if (existingConversationId) {
        return existingConversationId;
    }

    // Create new conversation
    const conversationId = await createConversation();
    await addParticipant(conversationId, userId1);
    await addParticipant(conversationId, userId2);

    return conversationId;
}

/**
 * Get all conversations for a user
 */
export function getUserConversations(userId: number): Promise<ConversationWithParticipants[]> {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT
                c.id,
                c.created_at,
                GROUP_CONCAT(cp.user_id) as participant_ids
            FROM conversations c
            INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
            WHERE c.id IN (
                SELECT conversation_id
                FROM conversation_participants
                WHERE user_id = ?
            )
            GROUP BY c.id, c.created_at
            ORDER BY c.created_at DESC
        `;

        db.all(query, [userId], (err: any, rows: any[]) => {
            if (err) {
                reject(new Error(`Failed to get user conversations: ${err.message}`));
            } else {
                const conversations = rows.map(row => ({
                    id: row.id,
                    created_at: row.created_at,
                    participants: row.participant_ids.split(',').map(Number)
                }));
                resolve(conversations);
            }
        });
    });
}

/**
 * Get conversation participants
 */
export function getConversationParticipants(conversationId: number): Promise<number[]> {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT user_id FROM conversation_participants WHERE conversation_id = ?',
            [conversationId],
            (err: any, rows: any[]) => {
                if (err) {
                    reject(new Error(`Failed to get participants: ${err.message}`));
                } else {
                    resolve(rows.map(row => row.user_id));
                }
            }
        );
    });
}

/**
 * Check if user is participant of conversation
 */
export function isUserInConversation(conversationId: number, userId: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
            [conversationId, userId],
            (err: any, row: any) => {
                if (err) {
                    reject(new Error(`Failed to check participant: ${err.message}`));
                } else {
                    resolve(!!row);
                }
            }
        );
    });
}
