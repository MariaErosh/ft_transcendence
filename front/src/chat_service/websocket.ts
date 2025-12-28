// WebSocket connection management

import type { ChatMessage } from './types.js';
import { ChatData } from './chatData.js';
import { displayMessage, loadMessageHistory } from './messageHandler.js';
import { updateStatus } from './uiRenderer.js';

const GATEWAY_WS_URL = "ws://localhost:3000/chat/ws";

let chatSocket: WebSocket | null = null;
let shouldReconnect = false;

/**
 * Connect to the chat WebSocket
 */
export function connectChat() {
	// Don't reconnect if already connected
	if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
		console.log("WebSocket already connected");
		return;
	}

	const token = localStorage.getItem("accessToken");

	if (!token) {
	updateStatus("Not logged in", "error");
	console.log("No access token - not connecting to chat");
	shouldReconnect = false;  // Don't reconnect without token
	return;
	}

	try {
	// Enable auto-reconnect when we have a valid token
	shouldReconnect = true;
	chatSocket = new WebSocket(`${GATEWAY_WS_URL}?token=${token}`);

	chatSocket.onopen = handleOpen;
	chatSocket.onmessage = handleMessage;
	chatSocket.onclose = handleClose;
	chatSocket.onerror = handleError;

	} catch (err) {
	console.error("Failed to connect to chat:", err);
	updateStatus("Connection failed", "error");
	}
}

/**
 * Handle WebSocket open event
 */
function handleOpen() {
  console.log("Chat WebSocket connected");
  ChatData.setConnected(true);
  updateStatus("Connected", "success");

  const hasRecipient = !!ChatData.getCurrentRecipient();
  const inputEl = document.getElementById("chat-input") as HTMLInputElement;
  const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;

  if (inputEl) inputEl.disabled = !hasRecipient;
  if (sendBtn) sendBtn.disabled = !hasRecipient;

  // Only load history if we have a recipient selected
  if (ChatData.getCurrentRecipient()) {
    loadMessageHistory();
  } else {
    clearMessages();
  }
}/**
 * Handle WebSocket message event
 */
function handleMessage(event: MessageEvent) {
  try {
    const message: ChatMessage = JSON.parse(event.data);

    // Handle different message types
    if (message.type === 'game_invitation' || message.type === 'invitation_response') {
      console.log('Game invitation received:', message);
      return;
    }

    const currentRecipient = ChatData.getCurrentRecipient();

    // Only display messages relevant to current conversation
    const isRelevantMessage =
      message.type === 'system' ||
      message.type === 'error' ||
      (currentRecipient && (
        message.sender_id === currentRecipient.userId ||
        message.conversation_id
      ));

    // Store new messages in history
    if (message.type === 'message') {
      ChatData.addMessage(message);
    }

    // Only display if relevant to current context
    if (isRelevantMessage) {
      displayMessage(message);
    }
  } catch (err) {
    console.error("Failed to parse message:", err);
  }
}

/**
 * Handle WebSocket close event
 */
function handleClose() {
  console.log("Chat WebSocket disconnected");
  ChatData.setConnected(false);
  updateStatus("Disconnected", "error");

  const inputEl = document.getElementById("chat-input") as HTMLInputElement;
  const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;
  if (inputEl) inputEl.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  // Auto-reconnect after 3 seconds
  if (shouldReconnect) {
    console.log("Reconnecting in 3 seconds...");
    setTimeout(connectChat, 3000);
  } else {
    console.log("Intentional disconnect - not reconnecting");
  }
}

/**
 * Handle WebSocket error event
 */
function handleError(error: Event) {
  console.error("Chat WebSocket error:", error);
  updateStatus("Connection error", "error");
}

/**
 * Send a chat message
 */
export function sendMessage(content: string) {
  if (!content.trim() || !chatSocket || !ChatData.isConnected()) return;

  const currentRecipient = ChatData.getCurrentRecipient();
  if (!currentRecipient || !currentRecipient.userId) {
    updateStatus("Select a user to chat with", "error");
    return;
  }

  try {
    const payload = {
      content: content.trim(),
      recipientId: currentRecipient.userId
    };

    chatSocket.send(JSON.stringify(payload));

    // Clear input field
    const inputEl = document.getElementById("chat-input") as HTMLInputElement;
    if (inputEl) inputEl.value = "";
  } catch (err) {
    console.error("Failed to send message:", err);
    updateStatus("Failed to send", "error");
  }
}

/**
 * Disconnect from chat
 */
export function disconnectChat() {
  shouldReconnect = false;
  if (chatSocket) {
    chatSocket.close();
    chatSocket = null;
  }
  ChatData.clearMessages();
  ChatData.setConnected(false);
  ChatData.setChatOpen(false);
}

/**
 * Reconnect to chat
 */
export function reconnectChat() {
  disconnectChat();
  connectChat();  // connectChat will set shouldReconnect=true if token exists
}

/**
 * Clear all messages from UI
 */
function clearMessages() {
  const messagesContainer = document.getElementById("chat-messages");
  if (!messagesContainer) return;
  messagesContainer.innerHTML = "";
}
