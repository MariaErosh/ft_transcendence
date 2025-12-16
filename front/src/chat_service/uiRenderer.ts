// UI rendering functions

import type { StatusType } from './types.js';
import { ChatState } from './chatState.js';
import { sendMessage } from './websocket.js';
import { loadUsers, selectUser, renderUserList } from './userManager.js';
import { displayStoredMessages } from './messageHandler.js';
import { escapeHtml } from './utils.js';

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
	bubble?.addEventListener("click", openChat);
}

// Render the full chat window (expanded state)
export function renderChatWindow() {
  if (!chatContainer) return;

  const currentRecipient = ChatState.getCurrentRecipient();
  const isUserListOpen = ChatState.isUserListOpen();

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
              ${currentRecipient ? `DM: @${currentRecipient.username}` : 'SELECT A USER'}
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
              placeholder="${currentRecipient ? `Message @${currentRecipient.username}...` : 'Select a user first...'}"
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
              ${!currentRecipient ? 'disabled' : ''}
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

  // Setup event listeners
  setupEventListeners();

  // Load users
  loadUsers();

  // Update UI based on connection state
  if (ChatState.isConnected()) {
    const hasRecipient = !!currentRecipient;
    enableInput(hasRecipient);
    updateStatus(hasRecipient ? "Connected" : "Select user to chat", hasRecipient ? "success" : "info");

    // Display stored message history
    displayStoredMessages();
  } else {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      updateStatus("Not logged in", "error");
    } else {
      updateStatus("Disconnected", "error");
    }
  }
}

/**
 * Setup event listeners for chat window
 */
function setupEventListeners() {
  const input = document.getElementById("chat-input") as HTMLInputElement;
  const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;
  const minimizeBtn = document.getElementById("chat-minimize") as HTMLButtonElement;
  const toggleUsersBtn = document.getElementById("toggle-users") as HTMLButtonElement;

  sendBtn?.addEventListener("click", () => sendMessage(input?.value || ""));
  input?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage(input.value);
  });
  minimizeBtn?.addEventListener("click", closeChat);
  toggleUsersBtn?.addEventListener("click", toggleUserListUI);
}

/**
 * Open chat window from bubble
 */
export function openChat() {
  ChatState.setChatOpen(true);
  renderChatWindow();
}

/**
 * Close chat window back to bubble
 */
export function closeChat() {
  ChatState.setChatOpen(false);
  renderChatBubble();
}

/**
 * Toggle user list panel
 */
function toggleUserListUI() {
  ChatState.toggleUserList();
  const panel = document.getElementById("user-list-panel");
  if (panel) {
    panel.className = `
      ${ChatState.isUserListOpen() ? 'w-32' : 'w-0'}
      border-r-4 border-black
      bg-gray-100
      overflow-hidden
      transition-all duration-200
    `;
  }
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
 * Update chat title
 */
export function updateChatTitle() {
  const titleEl = document.getElementById("chat-title");
  const currentRecipient = ChatState.getCurrentRecipient();

  if (titleEl) {
    titleEl.textContent = currentRecipient
      ? `DM: @${currentRecipient.username}`
      : 'SELECT A USER';
  }
}

/**
 * Update input placeholder
 */
export function updateInputPlaceholder() {
  const inputEl = document.getElementById("chat-input") as HTMLInputElement;
  const currentRecipient = ChatState.getCurrentRecipient();

  if (inputEl) {
    inputEl.placeholder = currentRecipient
      ? `Message @${currentRecipient.username}...`
      : 'Select a user first...';
    inputEl.disabled = !currentRecipient;
  }
}
