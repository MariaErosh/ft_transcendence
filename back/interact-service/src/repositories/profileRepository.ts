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
 * Update user profile bio
 */
export function updateProfile(userId: number, bio: string): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE profiles SET bio = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
            [bio, userId],
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
