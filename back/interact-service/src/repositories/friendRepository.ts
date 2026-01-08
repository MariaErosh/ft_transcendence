import { db } from '../db/database';

export interface Friend {
    id: number;
    user_id: number;
    friend_id: number;
    created_at: string;
}

/**
 * Add a friend relationship
 */
export function addFriend(userId: number, friendId: number): Promise<number> {
    return new Promise((resolve, reject) => {
        // Add bidirectional friendship
        db.run(
            'INSERT INTO friends (user_id, friend_id) VALUES (?, ?)',
            [userId, friendId],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        reject(new Error('Friendship already exists'));
                    } else {
                        reject(new Error(`Failed to add friend: ${err.message}`));
                    }
                } else {
                    // Add reverse friendship
                    db.run(
                        'INSERT INTO friends (user_id, friend_id) VALUES (?, ?)',
                        [friendId, userId],
                        function(err2) {
                            if (err2 && !err2.message.includes('UNIQUE constraint failed')) {
                                console.error('Failed to add reverse friendship:', err2);
                            }
                            resolve(this.lastID);
                        }
                    );
                }
            }
        );
    });
}

/**
 * Remove a friend relationship
 */
export function removeFriend(userId: number, friendId: number): Promise<void> {
    return new Promise((resolve, reject) => {
        // Remove both directions
        db.run(
            'DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
            [userId, friendId, friendId, userId],
            (err) => {
                if (err) {
                    reject(new Error(`Failed to remove friend: ${err.message}`));
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Get all friends for a user
 */
export function getFriends(userId: number): Promise<number[]> {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT friend_id FROM friends WHERE user_id = ?',
            [userId],
            (err: any, rows: any[]) => {
                if (err) {
                    reject(new Error(`Failed to get friends: ${err.message}`));
                } else {
                    resolve(rows.map(row => row.friend_id));
                }
            }
        );
    });
}

/**
 * Check if two users are friends
 */
export function areFriends(userId: number, friendId: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?',
            [userId, friendId],
            (err: any, row: any) => {
                if (err) {
                    reject(new Error(`Failed to check friendship: ${err.message}`));
                } else {
                    resolve(!!row);
                }
            }
        );
    });
}
