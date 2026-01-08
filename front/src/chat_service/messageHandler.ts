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
      return null;
    }

    const url = `/chat/messages?recipientId=${currentRecipient.userId}`;
    console.log('Loading message history from:', url);

    const data = await authorisedRequest(url);
    console.log('History loaded:', data.messages?.length, 'messages for', currentRecipient.username);
    console.log('Raw message data from backend:', data.messages);

    if (data.messages) {
      // Store messages with type field and normalized format including read status
      const messages = data.messages.map((msg: any) => ({
        type: 'message' as const,
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        sender_username: msg.sender_username || msg.username,
        content: msg.content,
        created_at: msg.created_at,
        is_read: msg.is_read,
        read_at: msg.read_at,
      }));

      console.log('Messages loaded with read status:', messages.map((m: ChatMessage) => ({ id: m.id, is_read: m.is_read })));
      ChatData.setMessageHistory(messages);

      // If chat is open, display them immediately
      const isChatOpen = ChatData.isChatOpen();
      if (isChatOpen) {
        clearMessages();
        messages.forEach((msg: ChatMessage) => displayMessage(msg));
      }

      // Return conversationId if messages exist
      return messages.length > 0 ? messages[0].conversation_id : null;
    }
    return null;
  } catch (err) {
    console.error('Failed to load message history:', err);
    return null;
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
    messageEl.textContent = message.content || "";
  } else if (message.type === "error") {
    messageEl.className = "text-center text-red-500 text-xs";
    messageEl.textContent = `Error: ${message.content || "Unknown error"}`;
  } else {
    // Determine read status indicator
    let readIndicator = '';

    // Get current user ID to determine if this is a sent message
    const currentUserId = getCurrentUserId();
    const isSentMessage = currentUserId && message.sender_id === currentUserId;

    // Debug logging
    if (isSentMessage) {
      console.log('Rendering sent message:', { 
        id: message.id, 
        is_read: message.is_read, 
        delivered: message.delivered,
        sender_id: message.sender_id,
        currentUserId 
      });
    }

    // Show read indicators only for messages sent by current user
    if (isSentMessage) {
      // Check is_read === 1 (not just truthy) since 0 is valid
      if (message.is_read === 1) {
        readIndicator = '<span class="text-blue-500 text-xs ml-1" title="Read">✓✓</span>';
      } else if (message.delivered !== undefined && message.delivered) {
        readIndicator = '<span class="text-gray-400 text-xs ml-1" title="Delivered">✓✓</span>';
      } else if (message.delivered !== undefined) {
        readIndicator = '<span class="text-gray-400 text-xs ml-1" title="Sent">✓</span>';
      } else {
        // Historical message from DB - show as delivered if not read
        readIndicator = '<span class="text-gray-400 text-xs ml-1" title="Delivered">✓✓</span>';
      }
    }

    messageEl.className = "bg-white p-2 rounded-lg shadow-sm";
    messageEl.innerHTML = `
      <div class="flex justify-between items-start gap-2">
        <div class="flex-1">
          <span class="font-semibold text-sm text-blue-600">${escapeHtml(message.sender_username || message.username || "Unknown")}</span>
          <p class="text-gray-800 text-sm mt-1">${escapeHtml(message.content || "")}</p>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-xs text-gray-400">${time}</span>
          ${readIndicator}
        </div>
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

/**
 * Get current user ID from JWT token
 */
function getCurrentUserId(): number | null {
	const token = localStorage.getItem('accessToken');
	if (!token) return null;

	try {
		const payload = JSON.parse(atob(token.split('.')[1]));
		return payload.userId || payload.sub || null;
	} catch (err) {
		console.error('Failed to decode token:', err);
		return null;
	}
}

/**
 * Mark all messages in a conversation as read
 */
export async function markConversationAsRead(conversationId: number) {
	if (!conversationId) {
		console.log('No conversation ID provided');
		return;
	}

	try {
		await authorisedRequest(`/chat/conversations/${conversationId}/read`, {
			method: 'POST'
		});
		console.log(`Marked conversation ${conversationId} as read`);
	} catch (err) {
		console.error('Failed to mark conversation as read:', err);
	}
}
