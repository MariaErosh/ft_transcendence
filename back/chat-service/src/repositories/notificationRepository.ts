import { db } from '../db/database';

// ============================================================================
// Types
// ============================================================================

export interface Notification {
    id: number;
    user_id: number;
    type: string;
    payload: string;
    is_read: number;
    created_at: string;
}

export interface CreateNotificationParams {
    userId: number;
    type: string;
    payload: any; // Will be JSON stringified
}

// ============================================================================
// Notification Repository
// ============================================================================

/**
 * Create a new notification
 */
export function createNotification(params: CreateNotificationParams): Promise<number> {
    return new Promise((resolve, reject) => {
        const payloadStr = typeof params.payload === 'string'
            ? params.payload
            : JSON.stringify(params.payload);

        db.run(
            'INSERT INTO notifications (user_id, type, payload) VALUES (?, ?, ?)',
            [params.userId, params.type, payloadStr],
            function(err) {
                if (err) {
                    reject(new Error(`Failed to create notification: ${err.message}`));
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
}

/**
 * Get notification by ID
 */
export function getNotificationById(notificationId: number): Promise<Notification | null> {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM notifications WHERE id = ?',
            [notificationId],
            (err: any, row: any) => {
                if (err) {
                    reject(new Error(`Failed to get notification: ${err.message}`));
                } else {
                    resolve(row || null);
                }
            }
        );
    });
}

/**
 * Get all notifications for a user
 */
export function getUserNotifications(userId: number, limit: number = 50): Promise<Notification[]> {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            [userId, limit],
            (err: any, rows: any[]) => {
                if (err) {
                    reject(new Error(`Failed to get notifications: ${err.message}`));
                } else {
                    resolve(rows);
                }
            }
        );
    });
}

/**
 * Get unread notifications for a user
 */
export function getUnreadNotifications(userId: number): Promise<Notification[]> {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM notifications
             WHERE user_id = ? AND is_read = 0
             ORDER BY created_at DESC`,
            [userId],
            (err: any, rows: any[]) => {
                if (err) {
                    reject(new Error(`Failed to get unread notifications: ${err.message}`));
                } else {
                    resolve(rows);
                }
            }
        );
    });
}

/**
 * Mark notification as read
 */
export function markAsRead(notificationId: number): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE notifications SET is_read = 1 WHERE id = ?',
            [notificationId],
            (err) => {
                if (err) {
                    reject(new Error(`Failed to mark notification as read: ${err.message}`));
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Mark all notifications as read for a user
 */
export function markAllAsRead(userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
            [userId],
            (err) => {
                if (err) {
                    reject(new Error(`Failed to mark all notifications as read: ${err.message}`));
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Delete a notification
 */
export function deleteNotification(notificationId: number): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM notifications WHERE id = ?',
            [notificationId],
            (err) => {
                if (err) {
                    reject(new Error(`Failed to delete notification: ${err.message}`));
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Delete all notifications for a user
 */
export function deleteUserNotifications(userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM notifications WHERE user_id = ?',
            [userId],
            (err) => {
                if (err) {
                    reject(new Error(`Failed to delete user notifications: ${err.message}`));
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Get count of unread notifications for a user
 */
export function getUnreadCount(userId: number): Promise<number> {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [userId],
            (err: any, row: any) => {
                if (err) {
                    reject(new Error(`Failed to get unread count: ${err.message}`));
                } else {
                    resolve(row?.count || 0);
                }
            }
        );
    });
}
