import { db } from '../db/database';

export interface Profile {
    id: number;
    user_id: number;
    bio: string | null;
    avatar_url: string | null;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface ProfileUpdate {
    bio?: string;
    avatar_url?: string;
    status?: string;
}



/**
 * Get user profile by user ID
 */
export function getProfile(userId: number): Promise<Profile | null> {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM profiles WHERE user_id = ?',
            [userId],
            (err: any, row: any) => {
                if (err) {
                    reject(new Error(`Failed to get profile: ${err.message}`));
                } else {
                    resolve(row || null);
                }
            }
        );
    });
}

/**
 * Create a profile for a user
 */
export function createProfile(userId: number): Promise<number> {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO profiles (user_id) VALUES (?)',
            [userId],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        reject(new Error('Profile already exists'));
                    } else {
                        reject(new Error(`Failed to create profile: ${err.message}`));
                    }
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
}

/**
 * Update user profile
 */
export function updateProfile(userId: number, updates: ProfileUpdate): Promise<void> {
    return new Promise((resolve, reject) => {
        const fields: string[] = [];
        const values: any[] = [];

        if (updates.bio !== undefined) {
            fields.push('bio = ?');
            values.push(updates.bio);
        }
        if (updates.avatar_url !== undefined) {
            fields.push('avatar_url = ?');
            values.push(updates.avatar_url);
        }
        if (updates.status !== undefined) {
            fields.push('status = ?');
            values.push(updates.status);
        }

        if (fields.length === 0) {
            return resolve();
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(userId);

        db.run(
            `UPDATE profiles SET ${fields.join(', ')} WHERE user_id = ?`,
            values,
            (err) => {
                if (err) {
                    reject(new Error(`Failed to update profile: ${err.message}`));
                } else {
                    resolve();
                }
            }
        );
    });
}



/**
 * Get or create profile for a user
 */
export async function getOrCreateProfile(userId: number): Promise<Profile> {
    let profile = await getProfile(userId);
    if (!profile) {
        await createProfile(userId);
        profile = await getProfile(userId);
    }
    return profile!;
}
