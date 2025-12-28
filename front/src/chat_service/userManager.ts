// User management functions

import { authorisedRequest } from "../api.js";
import type { User } from './types.js';
import { ChatData } from './chatData.js';
import { escapeHtml } from './utils.js';
import { updateStatus, renderDMView, renderHomeView } from './uiRenderer.js';
import { loadMessageHistory } from './messageHandler.js';

/**
 * Load all users and online users
 */
export async function loadUsers() {
  try {
    // Get all users from user service
    const allUsersData = await authorisedRequest('/users');
    console.log('Raw user data from /users:', allUsersData);
    let allUsers = allUsersData || [];

    // Get online users from chat service
    const onlineData = await authorisedRequest('/chat/users/online');
    console.log('Online users data:', onlineData);
    const onlineUsernames = new Set((onlineData.users || []).map((u: any) => u.username));

    // Map users with online status
    allUsers = allUsers.map((user: any) => ({
      username: user.username,
      userId: user.id,
      isOnline: onlineUsernames.has(user.username),
    }));

    console.log('Final allUsers array:', allUsers);
    ChatData.setAllUsers(allUsers);
    ChatData.setOnlineUsers(onlineData.users || []);
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

/**
 * Refresh online status for all users and friends
 * Lighter than loadUsers - only updates online status
 */
export async function refreshOnlineStatus() {
  try {
    console.log('Refreshing online status...');

    // Get current online users
    const onlineData = await authorisedRequest('/chat/users/online');
    const onlineUsernames = new Set((onlineData.users || []).map((u: any) => u.username));

    // Update allUsers with new online status
    const allUsers = ChatData.getAllUsers();
    const updatedUsers = allUsers.map(user => ({
      ...user,
      isOnline: onlineUsernames.has(user.username),
    }));
    ChatData.setAllUsers(updatedUsers);

    // Update friends with new online status
    const friends = ChatData.getFriends();
    const updatedFriends = friends.map(friend => ({
      ...friend,
      isOnline: onlineUsernames.has(friend.username),
    }));
    ChatData.setFriends(updatedFriends);

    console.log('Online status refreshed');
  } catch (err) {
    console.error('Failed to refresh online status:', err);
  }
}

/**
 * Load friends list from backend
 */
export async function loadFriends() {
  try {
    const friendsData = await authorisedRequest('/interact/friends');
    console.log('Friends data:', friendsData);

    // Get already loaded users to sync online status
    const allUsers = ChatData.getAllUsers();

    const friends = (friendsData || []).map((friend: any) => {
      // Find matching user to get online status
      const matchingUser = allUsers.find(u => u.username === friend.username);
      return {
        username: friend.username,
        userId: friend.id,
        isOnline: matchingUser?.isOnline || false,
      };
    });

    ChatData.setFriends(friends);
    console.log('Friends loaded:', friends);
  } catch (err) {
    console.error('Failed to load friends:', err);
    // If endpoint doesn't exist yet, set empty array
    ChatData.setFriends([]);
  }
}

/**
 * Open DM with a user
 * Action: User clicked on a friend/user in home view
 */
export async function openDM(user: User) {
  console.log('Opening DM with:', user);

  // Set the recipient
  ChatData.setCurrentRecipient(user);

  // Switch to DM view
  ChatData.setCurrentView('dm');

  // Load message history for this conversation
  await loadMessageHistory();

  // Render DM view
  renderDMView();
}

/**
 * Go back to home view from DM
 * Action: User clicked back button in DM view
 */
export async function goBackToHome() {
  console.log('Going back to home view');

  // Clear current recipient
  ChatData.setCurrentRecipient(null);

  // Clear messages
  ChatData.clearMessages();

  // Switch to home view
  ChatData.setCurrentView('home');

  // Refresh online status when returning to home
  await refreshOnlineStatus();

  // Render home view
  renderHomeView();
}