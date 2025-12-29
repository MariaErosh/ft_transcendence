// User management functions

import { authorisedRequest } from "../api.js";
import type { User } from './types.js';
import { ChatData } from './chatData.js';
import { updateStatus, renderDMView, renderHomeView } from './uiRenderer.js';
import { loadMessageHistory, markConversationAsRead } from './messageHandler.js';
import { clearTypingIndicator } from './websocket.js';

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

  // Clear typing indicator from previous conversation
  clearTypingIndicator();
  ChatData.setRecipientIsTyping(false);

  // Check if user is blocked
  const blockedUsers = ChatData.getBlockedUsers();
  if (user.userId && blockedUsers.includes(user.userId)) {
    updateStatus(`Cannot open chat with blocked user @${user.username}`, 'error');
    return;
  }

  // Set the recipient
  ChatData.setCurrentRecipient(user);

  // Switch to DM view
  ChatData.setCurrentView('dm');

  // Load message history for this conversation
  const conversationId = await loadMessageHistory();

  // Mark messages as read if conversation exists
  if (conversationId) {
    await markConversationAsRead(conversationId);
  }

  // Render DM view
  renderDMView();
}

/**
 * Go back to home view from DM
 * Action: User clicked back button in DM view
 */
export async function goBackToHome() {
  console.log('Going back to home view');

  // Clear typing indicator before switching
  clearTypingIndicator();
  ChatData.setRecipientIsTyping(false);

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

/**
 * Load blocked users list from backend
 */
export async function loadBlockedUsers() {
  try {
    const response = await authorisedRequest('/chat/blocks');
    console.log('Blocked users data:', response);

    const blockedUsers = response.blockedUsers || [];
    ChatData.setBlockedUsers(blockedUsers);

    console.log('Blocked users loaded:', blockedUsers);
  } catch (err) {
    console.error('Failed to load blocked users:', err);
    ChatData.setBlockedUsers([]);
  }
}

/**
 * Block a user
 * Action: User clicked "Block User" in dropdown menu
 */
export async function blockUser(userId: number) {
  try {
    console.log('Blocking user:', userId);

    const response = await authorisedRequest('/chat/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockedId: userId }),
    });

    if (response.success) {
      ChatData.addBlockedUser(userId);
      updateStatus('User blocked successfully', 'success');
      console.log('User blocked successfully');

      // Go back to home after blocking
      await goBackToHome();
    } else {
      updateStatus(response.error || 'Failed to block user', 'error');
    }
  } catch (err) {
    console.error('Failed to block user:', err);
    updateStatus('Failed to block user', 'error');
  }
}

/**
 * Unblock a user
 * Action: User clicked "Unblock User" in dropdown menu or from user list
 */
export async function unblockUser(userId: number) {
  try {
    console.log('Unblocking user:', userId);

    const response = await authorisedRequest(`/chat/blocks/${userId}`, {
      method: 'DELETE',
    });

    if (response.success) {
      ChatData.removeBlockedUser(userId);
      updateStatus('User unblocked successfully', 'success');
      console.log('User unblocked successfully');

      // Only re-render DM view if we're in DM view
      const currentView = ChatData.getCurrentView();
      if (currentView === 'dm') {
        renderDMView();
      }
    } else {
      updateStatus(response.error || 'Failed to unblock user', 'error');
    }
  } catch (err) {
    console.error('Failed to unblock user:', err);
    updateStatus('Failed to unblock user', 'error');
  }
}
