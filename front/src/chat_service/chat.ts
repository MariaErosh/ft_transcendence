// Chat WebSocket client for ft_transcendence

import { authorisedRequest } from "../api.js";

const GATEWAY_WS_URL = "ws://localhost:3000/chat/ws";

interface ChatMessage {
  type: "message" | "system" | "error";
  user_id?: number;
  username?: string;
  content: string;
  created_at?: number;
  timestamp?: number;
  recipient_id?: number | null;
  isDM?: boolean;
}

interface User {
  userId: number;
  username: string;
  isOnline?: boolean;
}

let chatSocket: WebSocket | null = null;
let chatContainer: HTMLElement | null = null;
let messagesContainer: HTMLElement | null = null;
let isConnected = false;
let isChatOpen = false;
let messageHistory: ChatMessage[] = [];
let storageListener: ((e: StorageEvent) => void) | null = null;
let shouldReconnect = false;
let allUsers: User[] = [];
let onlineUsers: User[] = [];
let currentRecipient: User | null = null; // null = public chat
let isUserListOpen = false;

/**
 * Initialize and render the chat UI (starts as bubble)
 */
export function renderChat() {
	chatContainer = document.getElementById("chat");
	if (!chatContainer) return;

	// Start with the chat bubble (closed state)
	renderChatBubble();

	// Connect to chat WebSocket
	connectChat();
	if (storageListener) {
		window.removeEventListener('storage', storageListener);
	}
	storageListener = (e: StorageEvent) => {
		console.log('🔔 Storage event fired!', e.key, 'new:', e.newValue, 'old:', e.oldValue);
		if (e.key === 'accessToken') {
			if (!e.newValue) {
				console.log('🔔 Access token removed, disconnecting chat');
				// Token removed = logout
				disconnectChat();
			} else {
				console.log('🔔 Access token added/changed, reconnecting chat');
				// New token = login
				reconnectChat();
			}
		}
	};
	window.addEventListener('storage', storageListener);
}

/**
 * Render the chat bubble (minimized state)
 */
function renderChatBubble() {
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
  bubble?.addEventListener("click", openChat);
}

/**
 * Render the full chat window (expanded state)
 */
function renderChatWindow() {
  if (!chatContainer) return;

  chatContainer.className = "fixed bottom-6 right-6 z-50";
  chatContainer.innerHTML = `
    <div class="
        bg-gray-200
        border-4 border-black
        w-96 h-[500px] flex
        shadow-[8px_8px_0_0_#000000]
        transition-all duration-150
    ">
      <!-- User List Panel -->
      <div id="user-list-panel" class="
        ${isUserListOpen ? 'w-32' : 'w-0'}
        border-r-4 border-black
        bg-gray-100
        overflow-hidden
        transition-all duration-200
      ">
        <div class="h-full overflow-y-auto p-2">
          <div id="user-list" class="space-y-1"></div>
        </div>
      </div>

      <!-- Chat Panel -->
      <div class="flex-1 flex flex-col">
        <div class="
          bg-purple-600
          text-white
          px-4 py-3
          border-b-4 border-black
          flex justify-between items-center
        ">
          <div class="flex items-center gap-2">
            <button id="toggle-users" class="
              text-lg hover:text-pink-400
              leading-none
            ">
              👥
            </button>
            <h3 id="chat-title" class="font-bold uppercase tracking-wider text-sm">
              ${currentRecipient ? `@${currentRecipient.username}` : '💬 PUBLIC CHAT'}
            </h3>
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
            > ESTABLISHING CONNECTION...
          </div>
        </div>

        <div class="
          border-t-4 border-black
          p-3
          bg-gray-300
        ">
          <div class="flex gap-2">
            <input
              id="chat-input"
              type="text"
              placeholder="${currentRecipient ? `DM to @${currentRecipient.username}...` : 'ENTER MESSAGE...'}"
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
              disabled
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
              disabled
            >
              SEND
            </button>
          </div>
          <div id="chat-status" class="
            text-xs
            text-red-500
            mt-1
            font-mono
            font-bold
          ">
            // DISCONNECTED
          </div>
        </div>
      </div>
    </div>
  `;

  messagesContainer = document.getElementById("chat-messages");

  // Setup event listeners
  const input = document.getElementById("chat-input") as HTMLInputElement;
  const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;
  const minimizeBtn = document.getElementById("chat-minimize") as HTMLButtonElement;
  const toggleUsersBtn = document.getElementById("toggle-users") as HTMLButtonElement;

  sendBtn?.addEventListener("click", () => sendMessage(input.value));
  input?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage(input.value);
  });
  minimizeBtn?.addEventListener("click", closeChat);
  toggleUsersBtn?.addEventListener("click", toggleUserList);

  // Load users
  loadUsers();

  // Update UI based on connection state
  if (isConnected) {
    enableInput(true);
    updateStatus("Connected", "success");
    clearMessages();
    // Display stored message history
    messageHistory.forEach(msg => displayMessage(msg));
  } else {
    // Update status for disconnected state
    const token = localStorage.getItem("accessToken");
    if (!token) {
      updateStatus("Not logged in", "error");
    } else {
      updateStatus("Disconnected", "error");
    }
  }
}

/**
 * Open chat window from bubble
 */
function openChat() {
  isChatOpen = true;
  renderChatWindow();
}

/**
 * Close chat window back to bubble
 */
function closeChat() {
  isChatOpen = false;
  renderChatBubble();
}

/**
 * Connect to the chat WebSocket
 */
function connectChat() {
  const token = localStorage.getItem("accessToken");

  if (!token) {
	updateStatus("Not logged in", "error");
    console.log("No access token - not connecting to chat");
    shouldReconnect = false; // Don't try to reconnect without token
    return;
  }

  try {
    chatSocket = new WebSocket(`${GATEWAY_WS_URL}?token=${token}`);

    chatSocket.onopen = () => {
      console.log("Chat WebSocket connected");
      isConnected = true;
      updateStatus("Connected", "success");
      enableInput(true);
      clearMessages();
	  loadMessageHistory();
    };

    chatSocket.onmessage = (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);

        // Only display messages relevant to current context
        const isRelevantMessage =
          message.type === 'system' ||
          message.type === 'error' ||
          // Show public messages when in public chat
          (!currentRecipient && !message.isDM) ||
          // Show DMs in the correct thread
          (currentRecipient && message.isDM && (
            message.recipient_id === currentRecipient.userId ||
            message.user_id === currentRecipient.userId
          ));

        // Store new messages in history (except system messages)
        if (message.type === 'message') {
          messageHistory.push(message);
        }

        // Only display if relevant to current context
        if (isRelevantMessage) {
          displayMessage(message);
        }
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    };

    chatSocket.onclose = () => {
      console.log("Chat WebSocket disconnected");
      isConnected = false;
      updateStatus("Disconnected", "error");
      enableInput(false);

      // Auto-reconnect after 3 seconds (only if not intentionally disconnected)
      if (shouldReconnect) {
        console.log("Reconnecting in 3 seconds...");
        setTimeout(connectChat, 3000);
      } else {
        console.log("Intentional disconnect - not reconnecting");
      }
    };

    chatSocket.onerror = (error) => {
      console.error("Chat WebSocket error:", error);
      updateStatus("Connection error", "error");
    };

  } catch (err) {
    console.error("Failed to connect to chat:", err);
    updateStatus("Connection failed", "error");
  }
}

/**
 * Load message history from server
  */
async function loadMessageHistory() {
  try {
    const url = currentRecipient
      ? `/chat/messages?recipientId=${currentRecipient.userId}`
      : '/chat/messages';

    const data = await authorisedRequest(url);
    console.log('History loaded:', data.messages?.length, 'messages');

    if (data.messages) {
      // Store messages with type field added
      messageHistory = data.messages.map((msg: any) => ({
        ...msg,
        type: 'message' as const
      }));

      // If chat is open, display them immediately
      if (isChatOpen && messagesContainer) {
        clearMessages();
        messageHistory.forEach(msg => displayMessage(msg));
      }
    }
  } catch (err) {
    console.error('Failed to load message history:', err);
  }
}

/**
 * Send a chat message
 */
function sendMessage(content: string) {
  const input = document.getElementById("chat-input") as HTMLInputElement;

  if (!content.trim() || !chatSocket || !isConnected) return;

  try {
    const payload: any = { content: content.trim() };

    // Add recipient info if it's a DM
    if (currentRecipient) {
      payload.recipientId = currentRecipient.userId;
      payload.recipientUsername = currentRecipient.username;
    }

    chatSocket.send(JSON.stringify(payload));
    input.value = "";
  } catch (err) {
    console.error("Failed to send message:", err);
    updateStatus("Failed to send", "error");
  }
}

/**
 * Display a message in the chat
 */
function displayMessage(message: ChatMessage) {
  if (!messagesContainer) return;

  const messageEl = document.createElement("div");
  const time = new Date(message.created_at || message.timestamp || Date.now())
    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (message.type === "system") {
    messageEl.className = "text-center text-gray-500 text-xs italic";
    messageEl.textContent = message.content;
  } else if (message.type === "error") {
    messageEl.className = "text-center text-red-500 text-xs";
    messageEl.textContent = `Error: ${message.content}`;
  } else {
    messageEl.className = "bg-white p-2 rounded-lg shadow-sm";
    messageEl.innerHTML = `
      <div class="flex justify-between items-start gap-2">
        <div class="flex-1">
          <span class="font-semibold text-sm text-blue-600">${message.username || "Unknown"}</span>
          <p class="text-gray-800 text-sm mt-1">${escapeHtml(message.content)}</p>
        </div>
        <span class="text-xs text-gray-400">${time}</span>
      </div>
    `;
  }

  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Update connection status
 */
function updateStatus(text: string, type: "success" | "error" | "info") {
  const statusEl = document.getElementById("chat-status");
  if (!statusEl) return;

  statusEl.textContent = text;
  statusEl.className = `text-xs mt-1 ${
    type === "success" ? "text-green-600" :
    type === "error" ? "text-red-600" :
    "text-gray-500"
  }`;
}

/**
 * Enable/disable input controls
 */
function enableInput(enabled: boolean) {
  const input = document.getElementById("chat-input") as HTMLInputElement;
  const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;

  if (input) input.disabled = !enabled;
  if (sendBtn) sendBtn.disabled = !enabled;
}

/**
 * Clear all messages
 */
function clearMessages() {
  if (!messagesContainer) return;
  messagesContainer.innerHTML = "";
}



/**
 * Disconnect from chat
 */
export function disconnectChat() {
  shouldReconnect = false; // Prevent auto-reconnect
  if (chatSocket) {
    chatSocket.close();
    chatSocket = null;
  }
  messageHistory = [];
  isConnected = false;
  isChatOpen = false;
}

/**
 * Reconnect to chat
 */
export function reconnectChat() {
  disconnectChat();
  shouldReconnect = true; // Re-enable auto-reconnect for new session
  connectChat();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Toggle user list panel
 */
function toggleUserList() {
  isUserListOpen = !isUserListOpen;
  const panel = document.getElementById("user-list-panel");
  if (panel) {
    panel.className = `
      ${isUserListOpen ? 'w-32' : 'w-0'}
      border-r-4 border-black
      bg-gray-100
      overflow-hidden
      transition-all duration-200
    `;
  }
}

/**
 * Load all users and online users
 */
async function loadUsers() {
  try {
    // Get all users from user service
    const allUsersData = await authorisedRequest('/users');
    allUsers = allUsersData || [];

    // Get online users from chat service
    const onlineData = await authorisedRequest('/chat/users/online');
    const onlineUserIds = new Set((onlineData.users || []).map((u: any) => u.userId));

    // Mark which users are online
    allUsers = allUsers.map((user: any) => ({
      userId: user.auth_user_id,
      username: user.username,
      isOnline: onlineUserIds.has(user.auth_user_id),
    }));

    renderUserList();
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

/**
 * Render the user list
 */
function renderUserList() {
  const userListEl = document.getElementById("user-list");
  if (!userListEl) return;

  const currentUsername = localStorage.getItem("username");

  userListEl.innerHTML = allUsers
    .filter((user) => user.username !== currentUsername) // Don't show yourself
    .map((user) => `
      <button
        data-user-id="${user.userId}"
        data-username="${user.username}"
        class="
          w-full text-left px-2 py-1
          text-xs font-mono
          hover:bg-purple-200
          ${currentRecipient?.userId === user.userId ? 'bg-purple-300' : ''}
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
      const userId = parseInt(btn.getAttribute('data-user-id') || '0');
      const username = btn.getAttribute('data-username') || '';
      selectUser(userId, username);
    });
  });
}

/**
 * Select a user to DM or switch to public chat
 */
async function selectUser(userId: number, username: string) {
  if (currentRecipient?.userId === userId) {
    // Clicking same user = go back to public chat
    currentRecipient = null;
  } else {
    currentRecipient = { userId, username };
  }

  // Update UI
  const titleEl = document.getElementById("chat-title");
  const inputEl = document.getElementById("chat-input") as HTMLInputElement;

  if (titleEl) {
    titleEl.textContent = currentRecipient
      ? `@${currentRecipient.username}`
      : '💬 PUBLIC CHAT';
  }

  if (inputEl) {
    inputEl.placeholder = currentRecipient
      ? `DM to @${currentRecipient.username}...`
      : 'ENTER MESSAGE...';
  }

  // Render user list to update selection
  renderUserList();

  // Load message history for this context
  await loadMessageHistory();
}

