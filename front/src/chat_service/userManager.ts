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
    let allUsers = allUsersData || [];

    // Get online users from chat service
    const onlineData = await authorisedRequest('/chat/users/online');
    const onlineUsernames = new Set((onlineData.users || []).map((u: any) => u.username));

    // Get conversations with unread counts
    const conversationsData = await authorisedRequest('/chat/conversations');
    const unreadCounts = new Map<number, number>();

    if (conversationsData.conversations) {
      conversationsData.conversations.forEach((conv: any) => {
        if (conv.unread_count > 0 && conv.other_user_id) {
          unreadCounts.set(conv.other_user_id, conv.unread_count);
        }
      });
    }

    // Map users with online status and unread counts
    allUsers = allUsers.map((user: any) => ({
      username: user.username,
      userId: user.id,
      isOnline: onlineUsernames.has(user.username),
      unreadCount: unreadCounts.get(user.id) || 0,
    }));

    ChatData.setAllUsers(allUsers);
    ChatData.setOnlineUsers(onlineData.users || []);
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

/**
 * Refresh all users, friends, and online status
 * Reloads complete user and friend lists with updated online status
 */
export async function refreshUsers() {
	try {
	await loadUsers();
	await loadFriends();
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
    //console.log('Friends data:', friendsData);

    // Get already loaded users to sync online status and unread counts
    const allUsers = ChatData.getAllUsers();

    const friends = (friendsData || []).map((friend: any) => {
      // Find matching user to get online status and unread count
      const matchingUser = allUsers.find(u => u.username === friend.username);
      return {
        username: friend.username,
        userId: friend.id,
        isOnline: matchingUser?.isOnline || false,
        unreadCount: matchingUser?.unreadCount || 0,
      };
    });

    ChatData.setFriends(friends);
    //console.log('Friends loaded:', friends);
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
  //console.log('Opening DM with:', user);

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
    // Reload users to update unread counts
    await loadUsers();
    await loadFriends();
  }

  // Render DM view
  renderDMView();
}

/**
 * Go back to home view from DM
 * Action: User clicked back button in DM view
 */
export async function goBackToHome() {
	//console.log('Going back to home view');

	// Clear typing indicator before switching
	clearTypingIndicator();
	ChatData.setRecipientIsTyping(false);
	ChatData.setCurrentRecipient(null);
	ChatData.clearMessages();
	ChatData.setCurrentView('home');
	await refreshUsers();
	renderHomeView();
}

/**
 * Load blocked users list from backend
 */
export async function loadBlockedUsers() {
	try {
	const response = await authorisedRequest('/chat/blocks');

	const blockedUsers = response.blockedUsers || [];
	ChatData.setBlockedUsers(blockedUsers);

	//console.log('Blocked users loaded:', blockedUsers);
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

export async function addFriend(friendId: number) {
	try {
		const response = await authorisedRequest('/interact/friends', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ friendId: friendId }),
		});

		//console.log('addFriend response:', response);

		if (response.success) {
			updateStatus('Friend added successfully', 'success');
			await loadFriends();
			renderDMView();
			console.log('Friend added successfully');
		} else {
			console.error('Add friend failed with response:', response);
			updateStatus(response.error || 'Failed to add friend', 'error');
		}
	} catch (err) {
		console.error('Failed to add friend:', err);
		updateStatus('Failed to add friend', 'error');
	}
}

export async function removeFriend(friendId: number) {
	try {
		console.log('Removing friend:', friendId);
		const response = await authorisedRequest(`/interact/friends/${friendId}`, {
			method: 'DELETE',
		});
		if (response.success) {
			updateStatus('Friend removed successfully', 'success');
			await loadFriends();
			renderDMView();
			console.log('Friend removed successfully');
		} else {
			updateStatus(response.error || 'Failed to remove friend', 'error');
		}
	} catch (err) {
		console.error('Failed to remove friend:', err);
		updateStatus('Failed to remove friend', 'error');
	}
}