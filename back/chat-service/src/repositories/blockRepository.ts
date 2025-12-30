import { db } from '../db/database';

// ============================================================================
// Types
// ============================================================================

export interface Block {
    id: number;
    blocker_id: number;
    blocked_id: number;
    created_at: string;
}

// ============================================================================
// Block Repository
// ============================================================================

/**
 * Block a user
 */
export function blockUser(blockerId: number, blockedId: number): Promise<number> {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO blocks (blocker_id, blocked_id) VALUES (?, ?)',
            [blockerId, blockedId],
            function(err) {
                if (err) {
                    // Check if it's a unique constraint violation
                    if (err.message.includes('UNIQUE constraint failed')) {
                        reject(new Error('User is already blocked'));
                    } else {
                        reject(new Error(`Failed to block user: ${err.message}`));
                    }
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
}

/**
 * Unblock a user
 */
export function unblockUser(blockerId: number, blockedId: number): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?',
            [blockerId, blockedId],
            (err) => {
                if (err) {
                    reject(new Error(`Failed to unblock user: ${err.message}`));
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Check if user is blocked
 */
export function isUserBlocked(blockerId: number, blockedId: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?',
            [blockerId, blockedId],
            (err: any, row: any) => {
                if (err) {
                    reject(new Error(`Failed to check block status: ${err.message}`));
                } else {
                    resolve(!!row);
                }
            }
        );
    });
}

/**
 * Check if either user has blocked the other
 */
export function areUsersBlocked(userId1: number, userId2: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT 1 FROM blocks
             WHERE (blocker_id = ? AND blocked_id = ?)
             OR (blocker_id = ? AND blocked_id = ?)`,
            [userId1, userId2, userId2, userId1],
            (err: any, row: any) => {
                if (err) {
                    reject(new Error(`Failed to check block status: ${err.message}`));
                } else {
                    resolve(!!row);
                }
            }
        );
    });
}

/**
 * Get all users blocked by a user
 */
export function getBlockedUsers(blockerId: number): Promise<number[]> {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT blocked_id FROM blocks WHERE blocker_id = ?',
            [blockerId],
            (err: any, rows: any[]) => {
                if (err) {
                    reject(new Error(`Failed to get blocked users: ${err.message}`));
                } else {
                    resolve(rows.map(row => row.blocked_id));
                }
            }
        );
    });
}

/**
 * Get all users who have blocked a specific user
 */
export function getUsersWhoBlocked(blockedId: number): Promise<number[]> {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT blocker_id FROM blocks WHERE blocked_id = ?',
            [blockedId],
            (err: any, rows: any[]) => {
                if (err) {
                    reject(new Error(`Failed to get blockers: ${err.message}`));
                } else {
                    resolve(rows.map(row => row.blocker_id));
                }
            }
        );
    });
}

/**
 * Get all block records for a user (both as blocker and blocked)
 */
export function getAllUserBlocks(userId: number): Promise<Block[]> {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM blocks
             WHERE blocker_id = ? OR blocked_id = ?
             ORDER BY created_at DESC`,
            [userId, userId],
            (err: any, rows: any[]) => {
                if (err) {
                    reject(new Error(`Failed to get user blocks: ${err.message}`));
                } else {
                    resolve(rows);
                }
            }
        );
    });
}
