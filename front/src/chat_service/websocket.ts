// WebSocket connection management
import type { ChatMessage } from './types.js';
import { ChatData } from './chatData.js';
import { displayMessage, loadMessageHistory, markConversationAsRead } from './messageHandler.js';
import { updateStatus } from './uiRenderer.js';

const GATEWAY_WS_URL = "ws://localhost:3000/chat/ws";

let chatSocket: WebSocket | null = null;
let shouldReconnect = false;

/**
 * Connect to the chat WebSocket
 */
export function connectChat(): Promise<boolean> {
	return new Promise((resolve) => {
		if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
			console.log("WebSocket already connected");
			resolve(true);
			return;
		}

		const token = localStorage.getItem("accessToken");
		if (!token) {
			updateStatus("Not logged in", "error");
			console.log("No access token - not connecting to chat");
			shouldReconnect = false;
			resolve(false);
			return;
		}

		try {
			shouldReconnect = true;
			chatSocket = new WebSocket(`${GATEWAY_WS_URL}?token=${token}`);

			chatSocket.onopen = () => {
				handleOpen();
				resolve(true);
			};
			chatSocket.onmessage = handleMessage;
			chatSocket.onclose = handleClose;
			chatSocket.onerror = (err) => {
				handleError(err);
				resolve(false);
			};
		} catch (err) {
			console.error("Failed to connect to chat:", err);
			updateStatus("Connection failed", "error");
			resolve(false);
		}
	});
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

		// Handle read receipt
		if (message.type === 'read_receipt') {
			console.log('Read receipt received:', message);
			handleReadReceipt(message);
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
			console.log('Storing new message:', { id: message.id, is_read: message.is_read, delivered: message.delivered });
			ChatData.addMessage(message);

			// Mark as read if message is from current open conversation
			if (currentRecipient &&
				message.sender_id === currentRecipient.userId &&
				message.conversation_id) {
				markConversationAsRead(message.conversation_id);
			}
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
 * Handle read receipt - mark messages in conversation as read
 */
function handleReadReceipt(message: ChatMessage) {
	console.log('Processing read receipt:', message);

	if (!message.conversation_id) {
		console.log('No conversation_id in read receipt');
		return;
	}

	const currentRecipient = ChatData.getCurrentRecipient();

	// Get current user ID from localStorage or stored state
	const currentUserId = getCurrentUserId();
	if (!currentUserId) {
		console.log('Cannot determine current user ID');
		return;
	}

	// Update messages in history - mark messages sent by current user as read
	const messages = ChatData.getMessageHistory();
	let updatedCount = 0;
	const updatedMessages = messages.map(msg => {
		// Mark as read if: same conversation AND sent by current user (not the reader)
		if (msg.conversation_id === message.conversation_id &&
			msg.sender_id === currentUserId) {
			updatedCount++;
			return { ...msg, is_read: 1, read_at: new Date().toISOString() };
		}
		return msg;
	});

	console.log(`Updated ${updatedCount} messages to read status`);
	ChatData.setMessageHistory(updatedMessages);

	// If we're currently viewing this conversation, update the UI
	if (currentRecipient) {
		// Check if any message in the current view matches this conversation
		const isCurrentConversation = messages.some(msg =>
			msg.conversation_id === message.conversation_id
		);

		if (isCurrentConversation) {
			console.log('Updating UI for current conversation');
			updateMessageReadIndicators();
		}
	}
}

/**
 * Get current user ID from token or stored state
 */
function getCurrentUserId(): number | null {
	const token = localStorage.getItem('accessToken');
	if (!token) return null;

	try {
		// Decode JWT token to get user ID
		const payload = JSON.parse(atob(token.split('.')[1]));
		return payload.userId || payload.sub || null;
	} catch (err) {
		console.error('Failed to decode token:', err);
		return null;
	}
}

/**
 * Update read indicators in the UI
 */
function updateMessageReadIndicators() {
	const messages = ChatData.getMessageHistory();
	const messagesContainer = document.getElementById('chat-messages');
	if (!messagesContainer) return;

	// Re-render all messages to update read indicators
	messagesContainer.innerHTML = '';
	messages.forEach(msg => {
		displayMessage(msg);
	});
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
