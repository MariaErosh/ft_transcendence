// WebSocket connection management

import type { ChatMessage } from './types.js';
import { ChatState } from './chatState.js';
import { displayMessage, loadMessageHistory } from './messageHandler.js';
import { updateStatus } from './uiRenderer.js';

const GATEWAY_WS_URL = "ws://localhost:3000/chat/ws";

let chatSocket: WebSocket | null = null;
let shouldReconnect = false;

/**
 * Connect to the chat WebSocket
 */
export function connectChat() {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    updateStatus("Not logged in", "error");
    console.log("No access token - not connecting to chat");
    shouldReconnect = false;
    return;
  }

  try {
    chatSocket = new WebSocket(GATEWAY_WS_URL);

    chatSocket.onopen = () => {
      // Send authentication token as first message
      if (chatSocket) {
        chatSocket.send(JSON.stringify({ type: 'auth', token }));
      }
    };
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
  ChatState.setConnected(true);
  updateStatus("Connected", "success");

  const hasRecipient = !!ChatState.getCurrentRecipient();
  const inputEl = document.getElementById("chat-input") as HTMLInputElement;
  const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;

  if (inputEl) inputEl.disabled = !hasRecipient;
  if (sendBtn) sendBtn.disabled = !hasRecipient;

  // Only load history if we have a recipient selected
  if (ChatState.getCurrentRecipient()) {
    loadMessageHistory();
  } else {
    clearMessages();
  }
}

/**
 * Handle WebSocket message event
 */
function handleMessage(event: MessageEvent) {
  try {
    const message: ChatMessage = JSON.parse(event.data);

    // Handle authentication response
    if (message.type === 'auth_success') {
      console.log('Chat authentication successful');
      handleOpen();
      return;
    }

    if (message.type === 'auth_error') {
      console.error('Chat authentication failed:', message.content);
      updateStatus("Authentication failed", "error");
      if (chatSocket) {
        chatSocket.close();
      }
      return;
    }

    // Handle different message types
    if (message.type === 'game_invitation' || message.type === 'invitation_response') {
      console.log('Game invitation received:', message);
      return;
    }

    const currentRecipient = ChatState.getCurrentRecipient();

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
      ChatState.addMessage(message);
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
  ChatState.setConnected(false);
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
  if (!content.trim() || !chatSocket || !ChatState.isConnected()) return;

  const currentRecipient = ChatState.getCurrentRecipient();
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
  ChatState.clearMessages();
  ChatState.setConnected(false);
  ChatState.setChatOpen(false);
}

/**
 * Reconnect to chat
 */
export function reconnectChat() {
  disconnectChat();
  shouldReconnect = true;
  connectChat();
}

/**
 * Clear all messages from UI
 */
function clearMessages() {
  const messagesContainer = document.getElementById("chat-messages");
  if (!messagesContainer) return;
  messagesContainer.innerHTML = "";
}

/**
 * Set reconnect behavior
 */
export function setShouldReconnect(value: boolean) {
  shouldReconnect = value;
}
