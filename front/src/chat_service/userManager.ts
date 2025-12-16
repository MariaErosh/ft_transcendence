// User management functions

import { authorisedRequest } from "../api.js";
import type { User } from './types.js';
import { ChatState } from './chatState.js';
import { escapeHtml } from './utils.js';
import { updateStatus, updateChatTitle, updateInputPlaceholder, enableInput } from './uiRenderer.js';
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
      isOnline: onlineUsernames.has(user.username),
    }));

    console.log('Final allUsers array:', allUsers);
    ChatState.setAllUsers(allUsers);
    ChatState.setOnlineUsers(onlineData.users || []);
    renderUserList();
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

/**
 * Render the user list
 */
export function renderUserList() {
  const userListEl = document.getElementById("user-list");
  if (!userListEl) return;

  const currentUsername = localStorage.getItem("username");
  const allUsers = ChatState.getAllUsers();
  const currentRecipient = ChatState.getCurrentRecipient();

  userListEl.innerHTML = allUsers
    .filter((user) => user.username !== currentUsername)
    .map((user) => `
      <button
        data-username="${user.username}"
        class="
          w-full text-left px-2 py-1
          text-xs font-mono
          hover:bg-purple-200
          ${currentRecipient?.username === user.username ? 'bg-purple-300' : ''}
          flex items-center gap-1
        "
      >
        <span class="
          w-2 h-2 rounded-full
          ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}
        "></span>
        <span class="truncate">${escapeHtml(user.username)}</span>
      </button>
    `)
    .join('');

  // Add click handlers
  userListEl.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const username = btn.getAttribute('data-username') || '';
      console.log('User button clicked:', username);
      if (username) {
        console.log('Selecting user:', username);
        selectUser(username);
      }
    });
  });
}

/**
 * Select a user to DM
 */
export async function selectUser(username: string) {
  const currentRecipient = ChatState.getCurrentRecipient();

  if (currentRecipient?.username === username) {
    // Clicking same user = deselect
    ChatState.setCurrentRecipient(null);
  } else {
    // Get userId from online users if available
    const onlineData = await authorisedRequest('/chat/users/online');
    const onlineUser = (onlineData.users || []).find((u: any) => u.username === username);
    ChatState.setCurrentRecipient({
      username,
      userId: onlineUser?.userId
    });
  }

  // Update UI
  updateChatTitle();
  updateInputPlaceholder();

  // Update send button
  const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;
  const isConnected = ChatState.isConnected();
  const hasRecipient = !!ChatState.getCurrentRecipient();

  if (sendBtn) {
    sendBtn.disabled = !hasRecipient || !isConnected;
  }

  // Update status
  if (hasRecipient) {
    updateStatus("Connected", "success");
  } else {
    updateStatus("Select user to chat", "info");
  }

  // Render user list to update selection
  renderUserList();

  // Load message history for this user
  if (ChatState.getCurrentRecipient()) {
    await loadMessageHistory();
  } else {
    clearMessages();
  }
}

/**
 * Clear all messages from UI
 */
function clearMessages() {
  const messagesContainer = document.getElementById("chat-messages");
  if (!messagesContainer) return;
  messagesContainer.innerHTML = "";
}
