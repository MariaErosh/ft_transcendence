// Message handling functions

import { authorisedRequest } from "../api.js";
import type { ChatMessage } from './types.js';
import { ChatData } from './chatData.js';
import { escapeHtml, formatTime } from './utils.js';
import { handleInvitationClick, isInvitationExpired, isInvitationJoined } from './gameInvitation.js';

/**
 * Load message history from server
 */
export async function loadMessageHistory() {
  try {
    const currentRecipient = ChatData.getCurrentRecipient();

    // Don't load history if no recipient is selected
    if (!currentRecipient || !currentRecipient.userId) {
      //console.log('No recipient selected, skipping history load');
      return null;
    }

    const url = `/chat/messages?recipientId=${currentRecipient.userId}`;
    //console.log('Loading message history from:', url);

    const data = await authorisedRequest(url);

    if (data.messages) {
      console.log('[loadMessageHistory] Raw messages from server:', data.messages);
      console.trace('[loadMessageHistory] Called from:');

      // Store messages with type field and normalized format including read status
      const messages = data.messages.map((msg: any) => {
        const mappedMsg = {
          type: msg.type || 'message',
          id: msg.id,
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          sender_username: msg.sender_username || msg.username,
          content: msg.content,
          created_at: msg.created_at,
          is_read: msg.is_read,
          read_at: msg.read_at,
          // Include invitation_data if present
          invitation_data: msg.invitation_data,
        };

        if (msg.type === 'game_invitation') {
          console.log('[loadMessageHistory] Game invitation found:', {
            id: msg.id,
            original_type: msg.type,
            mapped_type: mappedMsg.type,
            has_invitation_data: !!msg.invitation_data,
            invitation_data: msg.invitation_data
          });
        }

        return mappedMsg;
      });

      ChatData.setMessageHistory(messages);

      // If chat is open, display them immediately
      const isChatOpen = ChatData.isChatOpen();
      console.log('[loadMessageHistory] Chat open:', isChatOpen, 'Message count:', messages.length);
      if (isChatOpen) {
        console.log('[loadMessageHistory] Clearing and redisplaying messages');
        clearMessages();
        messages.forEach((msg: ChatMessage) => {
          console.log('[loadMessageHistory] Displaying message:', msg.id, msg.type);
          displayMessage(msg);
        });
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

  // Handle game invitation messages
  if (message.type === "game_invitation") {
    console.log('[displayMessage] Processing game_invitation:', message);
    const invitationData = message.invitation_data || {};
    const matchName = invitationData.match_name || invitationData.tournament_name || "Game";
    const senderUsername = message.sender_username || "Someone";
    const expiresAt = invitationData.expires_at;
    const isExpired = (expiresAt ? isInvitationExpired(expiresAt) : false) || isInvitationJoined(matchName);

    console.log('[displayMessage] Rendering game invitation:', {
      messageId: message.id,
      matchName,
      senderUsername,
      invitationData,
      isExpired,
      isJoined: isInvitationJoined(matchName)
    });

    messageEl.className = `${isExpired ? 'opacity-50' : ''} bg-gradient-to-r from-purple-900 to-pink-900 p-4 rounded-lg shadow-lg border-2 border-pink-500`;
    messageEl.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="text-3xl">🎮</div>
        <div class="flex-1">
          <div class="font-bold text-pink-300 text-sm mb-1">
            Game Invitation from @${escapeHtml(senderUsername)}
          </div>
          <div class="text-white text-sm mb-2">
            ${escapeHtml(message.content || "Challenge invitation!")}
          </div>
          ${isExpired ? `
            <span class="text-gray-500 text-xs italic">Expired</span>
          ` : `
            <button
              id="join-btn-${message.id || Date.now()}"
              class="
                bg-pink-500 hover:bg-pink-400
                text-black font-bold
                px-4 py-2 text-xs
                rounded
                border-2 border-black
                shadow-[2px_2px_0_0_#000000]
                hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]
                transition-all
                cursor-pointer
              "
              data-match-name="${escapeHtml(matchName)}"
              data-sender="${escapeHtml(senderUsername)}"
              data-expires="${expiresAt || ''}"
            >
              JOIN GAME →
            </button>
          `}
          <div class="text-xs text-gray-400 mt-2">${time}</div>
        </div>
      </div>
    `;

    messagesContainer.appendChild(messageEl);

    // Add event listener for the button after appending to DOM (only if not expired)
    if (!isExpired) {
      const btnId = `join-btn-${message.id || Date.now()}`;
      const acceptBtn = document.getElementById(btnId) as HTMLButtonElement;

      if (acceptBtn) {
        console.log('Button found, adding click listener');
        acceptBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const matchName = acceptBtn.getAttribute('data-match-name') || '';
          const senderUsername = acceptBtn.getAttribute('data-sender') || '';
          const expiresAt = acceptBtn.getAttribute('data-expires');
          console.log('Join button clicked:', { matchName, senderUsername, expiresAt });

          if (matchName) {
            handleInvitationClick(matchName, senderUsername, expiresAt ? Number(expiresAt) : undefined, acceptBtn);
          } else {
            console.error('Invalid match name:', matchName);
          }
        });
      } else {
        console.error('Button not found:', btnId);
      }
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return; // Early return to avoid the default message append at the end
  } else if (message.type === "system") {
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
  console.log('[clearMessages] Clearing all messages');
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
