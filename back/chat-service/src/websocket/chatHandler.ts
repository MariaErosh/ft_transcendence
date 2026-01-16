import { WebSocket } from 'ws';
import * as conversationRepo from '../repositories/conversationRepository';
import * as messageRepo from '../repositories/messageRepository';
import * as blockRepo from '../repositories/blockRepository';

// Track typing status: Map<userId, Map<recipientId, timeoutId>>
const typingTimeouts = new Map<number, Map<number, NodeJS.Timeout>>();

/**
 * Send message to user by ID
 */
export function sendMessageToUser(
	connectedClients: Map<string, any>,
	userId: number,
	message: any
	): boolean {
	for (const client of connectedClients.values()) {
		if (client.userId === userId && client.socket.readyState === WebSocket.OPEN) {
			client.socket.send(JSON.stringify(message));
			return true;
		}
	}
	return false;
}

/**
 * Save message to database and send to conversation participants
 */
async function handleChatMessage(
	userId: number,
	username: string,
	content: string,
	recipientId: number,
	socket: WebSocket,
	logger: any,
	connectedClients: Map<string, any>
) {
	try {
		// Check if users have blocked each other
		const blocked = await blockRepo.areUsersBlocked(userId, recipientId);
		if (blocked) {
			socket.send(JSON.stringify({
				type: 'error',
				content: 'Cannot send message to this user',
			}));
			return;
		}

		// Get or create conversation between users
		const conversationId = await conversationRepo.getOrCreateConversation(userId, recipientId);

		// Save message to database
		const messageId = await messageRepo.createMessage({
			conversationId,
			senderId: userId,
			content,
		});

		// Get the saved message
		const savedMessage = await messageRepo.getMessageById(messageId);

		if (!savedMessage) {
			throw new Error('Failed to retrieve saved message');
		}

		const messageData = {
			type: 'message',
			id: savedMessage.id,
			conversation_id: conversationId,
			sender_id: userId,
			sender_username: username,
			content: savedMessage.content,
			created_at: savedMessage.created_at,
			is_read: 0, // New messages are unread by default
			read_at: null,
		};

		logger.info({ userId, recipientId, conversationId }, 'Message saved');

		// Send to recipient if online
		const sent = sendMessageToUser(connectedClients, recipientId, messageData);

		// Send confirmation to sender
		if (socket.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify({
				...messageData,
				delivered: sent,
			}));
		}

		if (!sent) {
			logger.info({ recipientId }, 'Recipient is offline, message saved for later');
		}
	} catch (error: any) {
		logger.error({ error }, 'Failed to handle chat message');
		socket.send(JSON.stringify({
			type: 'error',
			content: error.message || 'Failed to send message',
		}));
	}
}

/**
 * Handle game invitation
 */
async function handleGameInvitation(
	userId: number,
	username: string,
	recipientId: number,
	invitationData: any,
	socket: WebSocket,
	logger: any,
	connectedClients: Map<string, any>
) {
	try {
		const blocked = await blockRepo.areUsersBlocked(userId, recipientId);
		if (blocked) {
			socket.send(JSON.stringify({ type: 'error', content: 'Cannot send invitation to this user' }));
			return;
		}

		const conversationId = await conversationRepo.getOrCreateConversation(userId, recipientId);
		const content = `${invitationData.match_name || invitationData.tournament_name || 'Game'}`;
		const storedInvitationData = {
			sender_id: userId,
			sender_username: username,
			match_id: invitationData.match_id,
			match_name: invitationData.match_name,
			tournament_id: invitationData.tournament_id,
			tournament_name: invitationData.tournament_name,
			expires_at: invitationData.expires_at,
			game_mode: invitationData.game_mode,
			invitation_type: invitationData.invitation_type
		};
		const messageId = await messageRepo.createMessage({
			conversationId,
			senderId: userId,
			content,
			messageType: 'game_invitation',
			metadata: JSON.stringify(storedInvitationData)
		});

		const savedMessage = await messageRepo.getMessageById(messageId);

		const message = {
			type: 'game_invitation',
			id: messageId,
			conversation_id: conversationId,
			sender_id: userId,
			sender_username: username,
			content,
			created_at: savedMessage?.created_at || new Date().toISOString(),
			invitation_data: storedInvitationData
		};

		logger.info({ userId, recipientId }, 'Game invitation sent');

		const sent = sendMessageToUser(connectedClients, recipientId, message);
		if (socket.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify({ ...message, delivered: sent }));
		}
	} catch (error: any) {
		logger.error({ error }, 'Failed to send game invitation');
		socket.send(JSON.stringify({ type: 'error', content: 'Failed to send invitation' }));
	}
}

/**
 * Handle typing indicator
 */
async function handleTypingIndicator(
	userId: number,
	username: string,
	recipientId: number,
	isTyping: boolean,
	logger: any,
	connectedClients: Map<string, any>
) {
	try {
		// Check if users have blocked each other
		const blocked = await blockRepo.areUsersBlocked(userId, recipientId);
		if (blocked) {
			return;
		}

		// Clear existing timeout for this user->recipient pair
		const userTimeouts = typingTimeouts.get(userId);
		if (userTimeouts) {
			const existingTimeout = userTimeouts.get(recipientId);
			if (existingTimeout) {
				clearTimeout(existingTimeout);
			}
		}

		// Send typing indicator to recipient
		const sent = sendMessageToUser(connectedClients, recipientId, {
			type: 'typing',
			sender_id: userId,
			sender_username: username,
			isTyping: isTyping,  // Use the actual parameter value
			timestamp: Date.now(),
		});

		// if (sent) {
		// 	logger.debug({ userId, recipientId, isTyping }, 'Typing indicator sent');
		// }

		// If user is typing, set timeout to auto-stop after 5 seconds
		if (isTyping) {
			const timeout = setTimeout(() => {
				// Auto-stop typing after timeout
				sendMessageToUser(connectedClients, recipientId, {
					type: 'typing',
					sender_id: userId,
					sender_username: username,
					isTyping: false,
					timestamp: Date.now(),
				});

				// Clean up timeout reference
				const timeouts = typingTimeouts.get(userId);
				if (timeouts) {
					timeouts.delete(recipientId);
				}
			}, 5000); // 5 second timeout

			// Store timeout
			if (!typingTimeouts.has(userId)) {
				typingTimeouts.set(userId, new Map());
			}
			typingTimeouts.get(userId)!.set(recipientId, timeout);
		} else {
			// User stopped typing, clean up
			if (userTimeouts) {
				userTimeouts.delete(recipientId);
			}
		}
	} catch (error: any) {
		logger.error({ error }, 'Failed to handle typing indicator');
	}
}

/**
 * Clear all typing timeouts for a user (called on disconnect)
 */
export function clearUserTypingTimeouts(userId: number) {
	const userTimeouts = typingTimeouts.get(userId);
	if (userTimeouts) {
		for (const timeout of userTimeouts.values()) {
			clearTimeout(timeout);
		}
		typingTimeouts.delete(userId);
	}
}

/**
 * Handle incoming WebSocket message
 */
export async function handleIncomingMessage(
	data: Buffer,
	userId: number,
	username: string,
	socket: WebSocket,
	logger: any,
	connectedClients: Map<string, any>
	) {
	try {
		const message = JSON.parse(data.toString());
		logger.info({ username, message }, 'Received message from client');

		// Handle game invitation
		if (message.type === 'game_invitation' && message.recipientId && message.invitationData) {
			await handleGameInvitation(
				userId,
				username,
				message.recipientId,
				message.invitationData,
				socket,
				logger,
				connectedClients
			);
			return;
		}

		// Handle typing indicator
		if (message.type === 'typing' && message.recipientId !== undefined && message.isTyping !== undefined) {
			await handleTypingIndicator(
				userId,
				username,
				message.recipientId,
				message.isTyping,
				logger,
				connectedClients
			);
			return;
		}

		// Handle chat message
		if (message.content && message.content.trim() && message.recipientId) {
			await handleChatMessage(
				userId,
				username,
				message.content.trim(),
				message.recipientId,
				socket,
				logger,
				connectedClients
			);
		} else {
			socket.send(JSON.stringify({
				type: 'error',
				content: 'Message must include content and recipientId',
			}));
		}
	} catch (error) {
		logger.error({ error }, 'Error processing message');
		socket.send(JSON.stringify({
			type: 'error',
			content: 'Failed to process message',
		}));
	}
}
