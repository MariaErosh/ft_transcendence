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

		// Handle typing indicator
		if (message.type === 'typing') {
			const currentRecipient = ChatData.getCurrentRecipient();
			// Only show typing if it's from the current conversation recipient
			if (currentRecipient && message.sender_id === currentRecipient.userId) {
				ChatData.setRecipientIsTyping(message.isTyping || false);
				updateTypingIndicator();
			}
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
 * Update typing indicator display
 */
function updateTypingIndicator() {
	const typingIndicator = document.getElementById('typing-indicator');
	if (!typingIndicator) return;

	const isTyping = ChatData.getRecipientIsTyping();
	const currentRecipient = ChatData.getCurrentRecipient();

	if (isTyping && currentRecipient) {
		typingIndicator.textContent = `${currentRecipient.username} is typing...`;
		typingIndicator.classList.remove('hidden');
	} else {
		typingIndicator.classList.add('hidden');
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

  // Prevent sending messages to blocked users
  const blockedUsers = ChatData.getBlockedUsers();
	if (blockedUsers.includes(currentRecipient.userId)) {
		updateStatus("Cannot send messages to blocked users", "error");
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
	if (inputEl)
		inputEl.value = "";
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
	clearTypingIndicator();
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

// Typing indicator throttle settings
const TYPING_THROTTLE_MS = 2000; // Send typing indicator at most every 2 seconds
const TYPING_STOP_TIMEOUT_MS = 3000; // Stop typing after 3 seconds of inactivity
let typingStopTimer: number | null = null;

/**
 * Typing indicator handler with throttle logic
 */
export function typingHandler() {
	if (!chatSocket || !ChatData.isConnected()) return;
	const currentRecipient = ChatData.getCurrentRecipient();
	if (!currentRecipient || !currentRecipient.userId) return;

	const now = Date.now();
	const lastTypingTime = ChatData.getLastTypingTime();

	// Throttle: only send if enough time has passed since last typing event
	if (now - lastTypingTime < TYPING_THROTTLE_MS) {
		// Still within throttle window, just reset the stop timer
		resetTypingStopTimer(currentRecipient.userId);
		return;
	}

	// Send typing indicator
	try {
		const payload = {
			type: 'typing',
			recipientId: currentRecipient.userId,
			isTyping: true
		};
		chatSocket.send(JSON.stringify(payload));
		ChatData.setTyping(true);
		ChatData.setLastTypingTime(now);
		console.log('Typing indicator sent');
	} catch (err) {
		console.error("Failed to send typing indicator:", err);
	}

	// Reset the stop timer
	resetTypingStopTimer(currentRecipient.userId);
}

/**
 * Reset the typing stop timer
 */
function resetTypingStopTimer(recipientId: number) {
	// Clear existing timer
	if (typingStopTimer !== null) {
		clearTimeout(typingStopTimer);
	}

	// Set new timer to send "stopped typing" after inactivity
	typingStopTimer = window.setTimeout(() => {
		stopTyping(recipientId);
	}, TYPING_STOP_TIMEOUT_MS);
}

/**
 * Send "stopped typing" indicator
 */
function stopTyping(recipientId: number) {
	if (!chatSocket || !ChatData.isConnected() || !ChatData.isTyping()) return;

	try {
		const payload = {
			type: 'typing',
			recipientId: recipientId,
			isTyping: false
		};
		chatSocket.send(JSON.stringify(payload));
		ChatData.setTyping(false);
		console.log('Stopped typing indicator sent');
	} catch (err) {
		console.error("Failed to send stop typing indicator:", err);
	}
}

/**
 * Manually stop typing (when user switches conversations or closes chat)
 */
export function clearTypingIndicator() {
	if (typingStopTimer !== null) {
		clearTimeout(typingStopTimer);
		typingStopTimer = null;
	}
	const currentRecipient = ChatData.getCurrentRecipient();
	if (currentRecipient?.userId && ChatData.isTyping()) {
		stopTyping(currentRecipient.userId);
	}
}
