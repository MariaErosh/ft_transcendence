// UI rendering functions

import type { StatusType, User } from './types.js';
import { ChatData } from './chatData.js';
import { connectChat, sendMessage, typingHandler } from './websocket.js';
import { loadUsers, openDM, goBackToHome, loadFriends, refreshOnlineStatus, loadBlockedUsers, blockUser, unblockUser } from './userManager.js';
import { displayStoredMessages } from './messageHandler.js';
import { escapeHtml } from './utils.js';
import { showProfile } from '../profile_front/profile.js';
import { renderLogin } from '../forms.js';

let chatContainer: HTMLElement | null = null;

// Start with the chat bubble (closed state)
export function initializeChatUI() {
	chatContainer = document.getElementById("chat");
	if (!chatContainer) return;
	renderChatBubble();
}

// Render the chat bubble (minimized state)
export function renderChatBubble() {
	if (!chatContainer) return;

	chatContainer.className = "fixed bottom-6 right-6 z-50";
	chatContainer.innerHTML = `
	<button id="chat-bubble" class="
		w-16 h-16
		bg-pink-500
		border-4 border-black
		rounded-full
		shadow-[6px_6px_0_0_#000000]
		hover:bg-pink-400
		active:shadow-none active:translate-x-[2px] active:translate-y-[2px]
		transition-all duration-150
		flex items-center justify-center
		text-3xl
	">
		💬
	</button>
	`;
	const bubble = document.getElementById("chat-bubble");
	bubble?.addEventListener("click", chatOpened);
}

/**
 * Open chat window from bubble
 */
export async function chatOpened() {
	ChatData.setChatOpen(true);
	ChatData.setCurrentView('home');
	const connected = await connectChat();
	if (connected) {
		Promise.all([loadUsers(), loadFriends(), loadBlockedUsers()]).then(() => {
			renderHomeView();
		});
	} else {
		renderHomeView();
	}
}

/**
 * Close chat window back to bubble
 */
export function closeChat() {
  ChatData.setChatOpen(false);
  renderChatBubble();
}

/**
 * Update connection status
 */
export function updateStatus(text: string, type: StatusType) {
  const statusEl = document.getElementById("chat-status");
  if (!statusEl) return;

  statusEl.textContent = text;
  statusEl.className = `text-xs mt-1 font-mono font-bold ${
    type === "success" ? "text-green-600" :
    type === "error" ? "text-red-600" :
    "text-gray-500"
  }`;
}

/**
 * Enable/disable input controls
 */
export function enableInput(enabled: boolean) {
  const input = document.getElementById("chat-input") as HTMLInputElement;
  const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;

  if (input) input.disabled = !enabled;
  if (sendBtn) sendBtn.disabled = !enabled;
}

/**
 * Render Home View
 * Shows friends list at top and all users list below
 */
export function renderHomeView() {
	if (!chatContainer) return;

	const username = localStorage.getItem("username");

	chatContainer.className = "fixed bottom-6 right-6 z-50";

	if (!username) {
		chatContainer.innerHTML = renderLoggedOutView();
		setupLoggedOutHandlers();
		return;
	}

	const data = getChatViewData();
	chatContainer.innerHTML = renderChatLayout(data);

	setupHeaderHandlers();
	setupFriendHandlers(data.friends);
	setupUserHandlers(data.allUsers);
}

function renderLoggedOutView(): string {
  return `
    <div class="
      bg-gray-200
      border-4 border-black
      w-96 h-[500px] flex flex-col
      shadow-[8px_8px_0_0_#000000]
    ">
      <!-- Header -->
      <div class="
        bg-purple-600
        text-white
        px-4 py-3
        border-b-4 border-black
        flex justify-between items-center
      ">
        <h3 class="font-bold uppercase tracking-wider text-sm">
          📨 CHAT
        </h3>
        <button
          id="chat-close"
          class="text-xl font-extrabold hover:text-pink-400 leading-none px-2"
        >
          ✕
        </button>
      </div>

      <!-- Body -->
      <div class="
        flex-1
        bg-gray-800
        flex flex-col items-center justify-center
        text-center
        px-6
      ">
        <div class="
          bg-gray-200
          border-4 border-black
          shadow-[6px_6px_0_0_#000000]
          p-6
          max-w-xs
        ">
          <h4 class="font-black uppercase mb-2">
            🔒 Locked
          </h4>
          <p class="text-sm font-mono mb-4">
            Log in to have access to the chat.
          </p>
          <button
            id="go-login"
            class="
              px-4 py-2
              bg-purple-600
              text-white
              font-bold
              border-2 border-black
              hover:bg-purple-700
              transition
            "
          >
            Login
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="
        border-t-4 border-black
        p-3
        bg-gray-300
        text-xs font-mono font-bold text-red-600
      ">
        // DISCONNECTED
      </div>
    </div>
  `;
}

function setupLoggedOutHandlers() {
  document
    .getElementById("go-login")
    ?.addEventListener("click", renderLogin);

  document
    .getElementById("chat-close")
    ?.addEventListener("click", closeChat);
}

function getChatViewData() {
	return {
		currentUsername: localStorage.getItem("username"),
		friends: ChatData.getFriends(),
		allUsers: ChatData.getAllUsers(),
		blockedUsers: ChatData.getBlockedUsers(),
		isConnected: ChatData.isConnected(),
	};
}

function renderChatLayout(data: ReturnType<typeof getChatViewData>): string {
	return `
	<div class="
		bg-gray-200
		border-4 border-black
		w-96 h-[500px] flex flex-col
		shadow-[8px_8px_0_0_#000000]
	">
		${renderHeader()}
		${renderHomeContent(data)}
		${renderFooter(data.isConnected)}
	</div>
	`;
}

function renderHeader(): string {
	return `
		<div class="bg-purple-600 text-white px-4 py-3 border-b-4 border-black flex justify-between items-center">
			<h3 class="font-bold uppercase tracking-wider text-sm">📨 CHAT</h3>
			<div class="flex gap-2">
			<button id="refresh-status" class="px-2 hover:text-pink-400">↻</button>
			<button id="chat-minimize" class="px-2 hover:text-pink-400">✕</button>
			</div>
		</div>
	`;
}

function renderFooter(isConnected: boolean): string {
	return `
		<div class="border-t-4 border-black p-3 bg-gray-300">
		<div class="text-xs font-mono font-bold ${
			isConnected ? "text-green-600" : "text-red-600"
		}">
			${isConnected ? "// CONNECTED" : "// DISCONNECTED"}
		</div>
		</div>
	`;
}

function renderHomeContent(data: ReturnType<typeof getChatViewData>): string {
	return `
		<div class="flex-1 overflow-y-auto bg-gray-800">
		${renderFriendsSection(data)}
		${renderAllUsersSection(data)}
		</div>
	`;
}

function renderFriendsSection(data: {
  friends: User[];
  blockedUsers: number[];
  currentUsername: string | null;
}): string {
  const { friends, blockedUsers, currentUsername } = data;

  return `
    <div class="border-b-4 border-black bg-pink-100">
      <div class="px-3 py-2 bg-pink-500 text-black font-bold text-xs uppercase tracking-wide">
        💜 Friends
      </div>
      <div id="friends-list" class="p-2 space-y-1">
        ${
          friends.length === 0
            ? `<div class="text-xs text-gray-500 italic px-2 py-2">No friends yet</div>`
            : friends
                .filter(u => u.username !== currentUsername)
                .map(u => renderUserRow(u, blockedUsers, "friend"))
                .join("")
        }
      </div>
    </div>
  `;
}

function renderAllUsersSection(data: {
  allUsers: User[];
  blockedUsers: number[];
  currentUsername: string | null;
}): string {
  const { allUsers, blockedUsers, currentUsername } = data;

  return `
    <div class="bg-gray-700">
      <div class="px-3 py-2 bg-purple-400 text-black font-bold text-xs uppercase tracking-wide">
        🌐 All Users
      </div>
      <div id="all-users-list" class="p-2 space-y-1">
        ${
          allUsers
            .filter(u => u.username !== currentUsername)
            .map(u => renderUserRow(u, blockedUsers, "all"))
            .join("")
        }
      </div>
    </div>
  `;
}

function renderUserRow(
  user: User,
  blockedUsers: number[],
  context: "friend" | "all"
): string {
  const isBlocked =
    typeof user.userId === "number" && blockedUsers.includes(user.userId);

  const isOnline = user.isOnline ?? false;
  const statusColor = isOnline ? "bg-green-500" : "bg-gray-400";

  if (isBlocked) {
    return `
      <div class="
        w-full px-2 py-2
        text-sm font-mono
        text-red-400 opacity-70
        flex items-center gap-2
      ">
        <span class="w-2 h-2 rounded-full ${statusColor}"></span>
        <span class="truncate flex-1">${escapeHtml(user.username)}</span>
        ${
          user.userId !== undefined
            ? `
              <button
                data-action="unblock"
                data-userid="${user.userId}"
                class="
                  px-2 py-1 text-xs font-bold
                  bg-green-500 hover:bg-green-600
                  text-white rounded
                  border-2 border-black
                "
              >
                Unblock
              </button>
            `
            : ""
        }
      </div>
    `;
  }

  return `
    <button
      data-username="${user.username}"
      data-userid="${user.userId ?? ""}"
      class="
        w-full text-left px-2 py-2
        text-sm font-mono
        text-gray-200
        hover:${context === "friend" ? "bg-pink-200" : "bg-purple-200"}
        hover:text-black
        flex items-center gap-2
        border-2 border-transparent
        hover:border-black
        transition-all
      "
    >
      <span class="w-2 h-2 rounded-full ${statusColor}"></span>
      <span class="truncate">${escapeHtml(user.username)}</span>
    </button>
  `;
}

function setupHeaderHandlers() {
	document.getElementById("chat-minimize")?.addEventListener("click", closeChat);

	document.getElementById("refresh-status")?.addEventListener("click", async () => {
		await refreshOnlineStatus();
		renderHomeView();
	});
}

function setupFriendHandlers(friends: User[]) {
	const friendsList = document.getElementById("friends-list");

	friendsList?.querySelectorAll('button[data-username]').forEach(btn => {
		btn.addEventListener("click", () => {
		const username = btn.getAttribute("data-username");
		const user = friends.find(f => f.username === username);
		if (user) openDM(user);
		});
	});

	friendsList?.querySelectorAll('button[data-action="unblock"]').forEach(btn => {
		btn.addEventListener("click", async () => {
		const userId = Number(btn.getAttribute("data-userid"));
		if (!userId) return;
		await unblockUser(userId);
		await refreshOnlineStatus();
		renderHomeView();
		});
	});
}

function setupUserHandlers(users: User[]) {
	const usersList = document.getElementById("all-users-list");

	usersList?.querySelectorAll('button[data-username]').forEach(btn => {
	btn.addEventListener("click", () => {
		const username = btn.getAttribute("data-username");
		const user = users.find(u => u.username === username);
		if (user) {
		openDM(user);
		}
	});
	});

	usersList?.querySelectorAll('button[data-action="unblock"]').forEach(btn => {
		btn.addEventListener("click", async () => {
		const userId = Number(btn.getAttribute("data-userid"));
		if (!userId) return;
		await unblockUser(userId);
		await refreshOnlineStatus();
		renderHomeView();
		});
	});
}

/**
 * Render DM View
 * Shows conversation with a specific user, includes back button and dropdown menu
 */
export function renderDMView() {
  if (!chatContainer) return;

  const currentRecipient = ChatData.getCurrentRecipient();
  const isConnected = ChatData.isConnected();

  if (!currentRecipient) {
    // Fallback to home view if no recipient
    renderHomeView();
    return;
  }

  chatContainer.className = "fixed bottom-6 right-6 z-50";
  chatContainer.innerHTML = `
    <div class="
        bg-gray-200
        border-4 border-black
        w-96 h-[500px] flex flex-col
        shadow-[8px_8px_0_0_#000000]
        transition-all duration-150
    ">
      <!-- Header -->
      <div class="
        bg-purple-600
        text-white
        px-4 py-3
        border-b-4 border-black
        flex justify-between items-center
      ">
        <div class="flex items-center gap-2">
          <button id="back-button" class="
            text-lg hover:text-pink-400
            leading-none
          ">
            ←
          </button>
          <h3 class="font-bold tracking-wider text-sm">
            CHAT WITH @${escapeHtml(currentRecipient.username)}
          </h3>
        </div>
        <div class="flex items-center gap-2">
          <div class="relative">
            <button id="dropdown-menu" class="
              text-xl hover:text-pink-400
              leading-none
              px-2
            ">
              ⋮
            </button>
            <div id="dropdown-content" class="
              hidden
              absolute right-0 top-8
              bg-white
              border-4 border-black
              shadow-[4px_4px_0_0_#000000]
              min-w-[180px]
              z-50
            ">
              <button data-action="add-friend" class="
                w-full text-left px-3 py-2
                text-xs font-bold uppercase
                hover:bg-green-200
                border-b-2 border-black
                text-black
              ">
                ➕ Add Friend
              </button>
              <button data-action="delete-friend" class="
                w-full text-left px-3 py-2
                text-xs font-bold uppercase
                hover:bg-red-200
                border-b-2 border-black
                text-black
              ">
                ➖ Delete Friend
              </button>
              <button data-action="block" class="
                w-full text-left px-3 py-2
                text-xs font-bold uppercase
                hover:bg-yellow-200
                border-b-2 border-black
                text-black
                block-btn
              ">
                🚫 Block User
              </button>
              <button data-action="unblock" class="
                w-full text-left px-3 py-2
                text-xs font-bold uppercase
                hover:bg-green-200
                border-b-2 border-black
                text-black
                unblock-btn
              ">
                ✅ Unblock User
              </button>
              <button data-action="profile" class="
                w-full text-left px-3 py-2
                text-xs font-bold uppercase
                hover:bg-blue-200
                border-b-2 border-black
                text-black
              ">
                👤 See Profile
              </button>
              <button data-action="game" class="
                w-full text-left px-3 py-2
                text-xs font-bold uppercase
                hover:bg-purple-200
                text-black
              ">
                🎮 Game Invitation
              </button>
            </div>
          </div>
          <button id="chat-minimize" class="
            text-xl font-extrabold
            hover:text-pink-400
            leading-none
            px-2
          ">
            ✕
          </button>
        </div>
      </div>

      <!-- Messages Container -->
      <div id="chat-messages" class="
        flex-1
        overflow-y-auto
        p-4
        space-y-3
        bg-black/90
        font-mono
        text-sm
      ">
        <div class="text-center text-green-400">
          > LOADING CONVERSATION...
        </div>
      </div>

      <!-- Typing Indicator -->
      <div id="typing-indicator" class="
        hidden
        px-4 py-2
        bg-black/80
        border-t-2 border-gray-700
        text-green-400
        text-xs
        italic
        font-mono
      ">
      </div>

      <!-- Input Footer -->
      <div class="
        border-t-4 border-black
        p-3
        bg-gray-300
      ">
        <div class="flex gap-2">
          <input
            id="chat-input"
            type="text"
            placeholder="Message @${escapeHtml(currentRecipient.username)}..."
            class="
              text-sm
              text-black
              flex-1
              px-3 py-2
              border-2 border-black
              bg-white
              focus:outline-none
              focus:border-purple-600
              font-mono
            "
            ${!isConnected ? 'disabled' : ''}
          />
          <button
            id="chat-send"
            class="
              text-sm
              px-4 py-2
              bg-pink-500
              text-black
              uppercase font-bold
              border-2 border-black
              shadow-[2px_2px_0_0_#000000]
              hover:bg-pink-400
              active:shadow-none active:translate-x-[2px] active:translate-y-[2px]
              disabled:bg-gray-400
            "
            ${!isConnected ? 'disabled' : ''}
          >
            SEND
          </button>
        </div>
        <div id="chat-status" class="
          text-xs
          mt-1
          font-mono
          font-bold
          ${isConnected ? 'text-green-600' : 'text-red-600'}
        ">
          ${isConnected ? '// CONNECTED' : '// DISCONNECTED'}
        </div>
      </div>
    </div>
  `;

  // Setup event listeners
  const input = document.getElementById("chat-input") as HTMLInputElement;
  const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;
  const minimizeBtn = document.getElementById("chat-minimize");
  const backBtn = document.getElementById("back-button");
  const dropdownBtn = document.getElementById("dropdown-menu");
  const dropdownContent = document.getElementById("dropdown-content");

  // Show/hide block/unblock buttons based on blocked status
  const blockedUsersList = ChatData.getBlockedUsers();
  const isBlocked = currentRecipient.userId ? blockedUsersList.includes(currentRecipient.userId) : false;
  const blockBtn = dropdownContent?.querySelector('.block-btn');
  const unblockBtn = dropdownContent?.querySelector('.unblock-btn');

  if (isBlocked) {
    blockBtn?.classList.add('hidden');
    unblockBtn?.classList.remove('hidden');
  } else {
    blockBtn?.classList.remove('hidden');
    unblockBtn?.classList.add('hidden');
  }

  sendBtn?.addEventListener("click", () => sendMessage(input?.value || ""));
  input?.addEventListener("keypress", (e) => {
	typingHandler();
    if (e.key === "Enter") sendMessage(input.value);
  });
  minimizeBtn?.addEventListener("click", closeChat);
  backBtn?.addEventListener("click", () => {
    goBackToHome();
    renderHomeView();
  });

  // Dropdown menu toggle
  dropdownBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownContent?.classList.toggle('hidden');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdownContent?.contains(e.target as Node) && e.target !== dropdownBtn) {
      dropdownContent?.classList.add('hidden');
    }
  });

  // Dropdown menu actions
  dropdownContent?.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      dropdownContent?.classList.add('hidden');

      switch (action) {
        case 'add-friend':
          console.log('Add friend:', currentRecipient.username);
          // TODO: Implement add friend
          break;
        case 'delete-friend':
          console.log('Delete friend:', currentRecipient.username);
          // TODO: Implement delete friend
          break;
        case 'block':
          if (currentRecipient.userId) {
            blockUser(currentRecipient.userId);
          } else {
            console.error('Cannot block user: userId is undefined');
            updateStatus('Error: Cannot block user', 'error');
          }
          break;
        case 'unblock':
          if (currentRecipient.userId) {
            unblockUser(currentRecipient.userId);
          } else {
            console.error('Cannot unblock user: userId is undefined');
            updateStatus('Error: Cannot unblock user', 'error');
          }
          break;
        case 'profile':
          if (currentRecipient?.userId) {
            showProfile(currentRecipient.userId);
          } else {
            console.error('Cannot show profile: userId is undefined');
            updateStatus('Error: Cannot show profile', 'error');
          }
          break;
        case 'game':
          console.log('Game invitation to:', currentRecipient.username);
          // TODO: Implement game invitation
          break;
      }
    });
  });

  // Display stored messages
  displayStoredMessages();
}
