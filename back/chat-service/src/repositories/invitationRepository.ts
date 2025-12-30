import { db } from '../db/database';

// ============================================================================
// Types
// ============================================================================

export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface GameInvitation {
    id: number;
    sender_id: number;
    receiver_id: number;
    status: InvitationStatus;
    created_at: string;
}

export interface CreateInvitationParams {
    senderId: number;
    receiverId: number;
}

// ============================================================================
// Game Invitation Repository
// ============================================================================

/**
 * Create a new game invitation
 */
export function createInvitation(params: CreateInvitationParams): Promise<number> {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO game_invitations (sender_id, receiver_id) VALUES (?, ?)',
            [params.senderId, params.receiverId],
            function(err) {
                if (err) {
                    reject(new Error(`Failed to create invitation: ${err.message}`));
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
}

/**
 * Get invitation by ID
 */
export function getInvitationById(invitationId: number): Promise<GameInvitation | null> {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM game_invitations WHERE id = ?',
            [invitationId],
            (err: any, row: any) => {
                if (err) {
                    reject(new Error(`Failed to get invitation: ${err.message}`));
                } else {
                    resolve(row || null);
                }
            }
        );
    });
}

/**
 * Update invitation status
 */
export function updateInvitationStatus(invitationId: number, status: InvitationStatus): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE game_invitations SET status = ? WHERE id = ?',
            [status, invitationId],
            (err) => {
                if (err) {
                    reject(new Error(`Failed to update invitation: ${err.message}`));
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Get pending invitations sent by a user
 */
export function getSentInvitations(senderId: number): Promise<GameInvitation[]> {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM game_invitations WHERE sender_id = ? ORDER BY created_at DESC',
            [senderId],
            (err: any, rows: any[]) => {
                if (err) {
                    reject(new Error(`Failed to get sent invitations: ${err.message}`));
                } else {
                    resolve(rows);
                }
            }
        );
    });
}

/**
 * Get invitations received by a user
 */
export function getReceivedInvitations(receiverId: number, status?: InvitationStatus): Promise<GameInvitation[]> {
    return new Promise((resolve, reject) => {
        let query = 'SELECT * FROM game_invitations WHERE receiver_id = ?';
        const params: any[] = [receiverId];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        db.all(query, params, (err: any, rows: any[]) => {
            if (err) {
                reject(new Error(`Failed to get received invitations: ${err.message}`));
            } else {
                resolve(rows);
            }
        });
    });
}

/**
 * Get pending invitations for a user (as receiver)
 */
export function getPendingInvitations(receiverId: number): Promise<GameInvitation[]> {
    return getReceivedInvitations(receiverId, 'pending');
}

/**
 * Delete an invitation
 */
export function deleteInvitation(invitationId: number): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM game_invitations WHERE id = ?',
            [invitationId],
            (err) => {
                if (err) {
                    reject(new Error(`Failed to delete invitation: ${err.message}`));
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Check if there's already a pending invitation between two users
 */
export function hasPendingInvitation(senderId: number, receiverId: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT 1 FROM game_invitations
             WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'`,
            [senderId, receiverId],
            (err: any, row: any) => {
                if (err) {
                    reject(new Error(`Failed to check pending invitation: ${err.message}`));
                } else {
                    resolve(!!row);
                }
            }
        );
    });
}
