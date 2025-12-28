// Message handling functions

import { authorisedRequest } from "../api.js";
import type { ChatMessage } from './types.js';
import { ChatData } from './chatData.js';
import { escapeHtml, formatTime } from './utils.js';

/**
 * Load message history from server
 */
export async function loadMessageHistory() {
  try {
    const currentRecipient = ChatData.getCurrentRecipient();

    // Don't load history if no recipient is selected
    if (!currentRecipient || !currentRecipient.userId) {
      console.log('No recipient selected, skipping history load');
      return;
    }

    const url = `/chat/messages?recipientId=${currentRecipient.userId}`;
    console.log('Loading message history from:', url);

    const data = await authorisedRequest(url);
    console.log('History loaded:', data.messages?.length, 'messages for', currentRecipient.username);

    if (data.messages) {
      // Store messages with type field and normalized format
      const messages = data.messages.map((msg: any) => ({
        type: 'message' as const,
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        sender_username: msg.sender_username || msg.username,
        content: msg.content,
        created_at: msg.created_at,
      }));

      ChatData.setMessageHistory(messages);

      // If chat is open, display them immediately
      const isChatOpen = ChatData.isChatOpen();
      if (isChatOpen) {
        clearMessages();
        messages.forEach((msg: ChatMessage) => displayMessage(msg));
      }
    }
  } catch (err) {
    console.error('Failed to load message history:', err);
  }
}

/**
 * Display a message in the chat
 */
export function displayMessage(message: ChatMessage) {
  const messagesContainer = document.getElementById("chat-messages");
  if (!messagesContainer) return;

  const messageEl = document.createElement("div");
  const time = formatTime(message.created_at || message.timestamp);

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
          <span class="font-semibold text-sm text-blue-600">${escapeHtml(message.sender_username || message.username || "Unknown")}</span>
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
 * Display all stored messages from history
 */
export function displayStoredMessages() {
  clearMessages();
  const messageHistory = ChatData.getMessageHistory();
  messageHistory.forEach(msg => displayMessage(msg));
}

/**
 * Clear all messages from UI
 */
export function clearMessages() {
  const messagesContainer = document.getElementById("chat-messages");
  if (!messagesContainer) return;
  messagesContainer.innerHTML = "";
}
