import { FastifyInstance } from 'fastify';
import * as conversationRepo from '../repositories/conversationRepository';
import * as messageRepo from '../repositories/messageRepository';
import * as blockRepo from '../repositories/blockRepository';
import { requiredEnv } from "../index.js";

const USER_URL = requiredEnv("USER_SERVICE") + ":" + requiredEnv("USER_PORT");
const GATEWAY_SECRET = requiredEnv("GATEWAY_SECRET");

/**
 * Validate gateway authentication and extract user ID
 */
function validateGatewayAuth(request: any, reply: any): number | null {
    const gatewaySecret = (request.headers as any)['x-gateway-secret'];
    if (gatewaySecret !== GATEWAY_SECRET) {
        reply.code(401).send({ error: 'Unauthorized' });
        return null;
    }
    return parseInt((request.headers as any)['x-user-id']);
}

/**
 * Fetch username for a given user ID from user-service
 */
async function getUsernameById(userId: number): Promise<string | null> {
    try {
        const response = await fetch(`${USER_URL}/users/${userId}`, {
            headers: {
                'x-gateway-secret': GATEWAY_SECRET || ''
            }
        });

        if (!response.ok) {
            return null;
        }

        const user: any = await response.json();
        return user.username || null;
    } catch (error) {
        console.error(`Failed to fetch username for user ${userId}:`, error);
        return null;
    }
}

/**
 * Enrich messages with sender usernames
 */
async function enrichMessagesWithUsernames(messages: any[]): Promise<any[]> {
    // Collect unique sender IDs
    const senderIds = [...new Set(messages.map(msg => msg.sender_id))];

    // Fetch all usernames in parallel
    const usernamePromises = senderIds.map(id =>
        getUsernameById(id).then(username => ({ id, username }))
    );
    const usernames = await Promise.all(usernamePromises);

    // Create a map of userId -> username
    const usernameMap = new Map(
        usernames.map(({ id, username }) => [id, username])
    );

    // Add sender_username to each message and parse metadata if present
    return messages.map(msg => {
        const enrichedMsg: any = {
            ...msg,
            sender_username: usernameMap.get(msg.sender_id) || 'Unknown',
            type: msg.message_type || 'text'
        };

        // Parse metadata JSON if it exists
        if (msg.metadata) {
            try {
                enrichedMsg.invitation_data = JSON.parse(msg.metadata);
            } catch (error) {
                console.error('Failed to parse message metadata:', error);
            }
        }

        // Debug log for game invitations
        if (enrichedMsg.type === 'game_invitation') {
            console.log('Enriched game invitation:', {
                id: enrichedMsg.id,
                type: enrichedMsg.type,
                has_invitation_data: !!enrichedMsg.invitation_data,
                message_type_from_db: msg.message_type
            });
        }

        return enrichedMsg;
    });
}

export function registerMessageRoutes(app: FastifyInstance) {
	// Get message history
	app.get('/chat/messages', async (request: any, reply: any) => {
		try {
			// Verify authentication
			const userId = validateGatewayAuth(request, reply);
			if (userId === null) return; // Reply already sent by validateGatewayAuth

			const recipientId = (request.query as any).recipientId;

			if (recipientId) {
				// Check if blocked
				const blocked = await blockRepo.areUsersBlocked(userId, parseInt(recipientId));
				if (blocked) {
					return reply.code(403).send({ error: 'Cannot access messages with this user' });
				}

				// Get conversation between users
				const conversationId = await conversationRepo.findConversationBetweenUsers(userId, parseInt(recipientId));

				if (!conversationId) {
					app.log.info({ userId, recipientId }, 'No conversation found between users');
					return reply.send({ messages: [] });
				}

				// Get messages from conversation
				const messages = await messageRepo.getMessagesByConversation(conversationId, 50);
				app.log.info({ conversationId, messageCount: messages.length }, 'Messages retrieved from DB');
				const enrichedMessages = await enrichMessagesWithUsernames(messages);
				app.log.info({ enrichedCount: enrichedMessages.length }, 'Messages enriched with usernames');
				return reply.send({ messages: enrichedMessages });
			} else {
				// Get all recent messages for user across all conversations
				const messages = await messageRepo.getUserRecentMessages(userId, 50);
				const enrichedMessages = await enrichMessagesWithUsernames(messages);
				return reply.send({ messages: enrichedMessages });
			}
		} catch (error: any) {
			app.log.error({ error }, 'Failed to get message history');
			return reply.code(500).send({ error: 'Failed to fetch messages' });
		}
	});
}
