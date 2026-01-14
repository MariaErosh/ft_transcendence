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