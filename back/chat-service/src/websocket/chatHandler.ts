import { WebSocket } from 'ws';
import * as conversationRepo from '../repositories/conversationRepository';
import * as messageRepo from '../repositories/messageRepository';
import * as blockRepo from '../repositories/blockRepository';

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
export async function handleChatMessage(
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
