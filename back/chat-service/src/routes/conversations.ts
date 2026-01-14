import { FastifyInstance } from 'fastify';
import * as conversationRepo from '../repositories/conversationRepository';
import * as messageRepo from '../repositories/messageRepository';
import { GATEWAY_SECRET } from "../index.js"

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

export function registerConversationRoutes(
	app: FastifyInstance,
	sendToUser: (userId: number, message: any) => boolean
) {
	// Get all conversations for the current user
	app.get('/chat/conversations', async (request: any, reply: any) => {
		try {
			const userId = validateGatewayAuth(request, reply);
			if (userId === null) return;

			const conversations = await conversationRepo.getUserConversations(userId);

			// Enhance conversation data with other participant info
			const enhancedConversations = conversations.map(conv => {
				// Find the other participant (not the current user)
				const otherParticipantId = conv.participants.find((id: number) => id !== userId);

				return {
					id: conv.id,
					created_at: conv.created_at,
					other_user_id: otherParticipantId,
					unread_count: conv.unread_count
				};
			});

			return reply.send({ conversations: enhancedConversations });
		} catch (error: any) {
			app.log.error({ error }, 'Failed to get conversations');
			return reply.code(500).send({ error: 'Failed to fetch conversations' });
		}
	});


	app.post('/chat/conversations/:conversationId/read', async (request: any, reply: any) => {
		try {
			const userId = validateGatewayAuth(request, reply);
			if (userId === null) return;

			const conversationId = parseInt((request.params as any).conversationId);

			// Verify user is participant in this conversation
			const isParticipant = await conversationRepo.isUserInConversation(conversationId, userId);
			if (!isParticipant) {
				// If user is not a participant, it likely means the conversation doesn't exist yet (no messages)
				// Just return success without doing anything
				app.log.info({ conversationId, userId }, 'User not in conversation - likely no messages yet');
				return reply.send({ success: true, marked: 0 });
			}

			// Mark messages as read
			await messageRepo.markConversationAsRead(conversationId, userId);

			// Get all participants in the conversation
			const participants = await conversationRepo.getConversationParticipants(conversationId);

			// Send read receipt to other participants
			for (const participantId of participants) {
				if (participantId !== userId) {
					sendToUser(participantId, {
						type: 'read_receipt',
						conversation_id: conversationId,
						read_by_user_id: userId,
						timestamp: Date.now()
					});
				}
			}

			app.log.info({ conversationId, userId }, 'Messages marked as read, receipts sent');
			return reply.send({ success: true });
		} catch (error: any) {
			app.log.error({
				error: error.message,
				stack: error.stack,
				conversationId: (request.params as any).conversationId
			}, 'Failed to mark messages as read');
			return reply.code(500).send({ error: 'Failed to mark messages as read' });
		}
	});
}
