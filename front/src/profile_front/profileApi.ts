// Profile API functions

import { authorisedRequest } from "../api.js";
import type { UserProfile } from './types.js';

/**
 * Get user profile by user ID
 */
export async function getProfile(userId: number): Promise<UserProfile | null> {
  try {
    const response = await authorisedRequest(`/interact/profile/${userId}`);
    return response;
  } catch (err) {
    console.error('Failed to load profile:', err);
    return null;
  }
}

/**
 * Get own profile
 */
export async function getOwnProfile(): Promise<UserProfile | null> {
  try {
    const response = await authorisedRequest('/interact/profile');
    return response;
  } catch (err) {
    console.error('Failed to load own profile:', err);
    return null;
  }
}

/**
 * Update own profile
 */
export async function updateProfile(updates: { bio?: string; avatar_url?: string; status?: string }): Promise<boolean> {
  try {
    const response = await authorisedRequest('/interact/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    return response.success === true;
  } catch (err) {
    console.error('Failed to update profile:', err);
    return false;
  }
}
