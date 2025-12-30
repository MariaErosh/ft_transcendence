import { FastifyInstance } from 'fastify';
import * as conversationRepo from '../repositories/conversationRepository';
import * as messageRepo from '../repositories/messageRepository';

/**
 * Validate gateway authentication and extract user ID
 */
function validateGatewayAuth(request: any, reply: any): number | null {
    const gatewaySecret = (request.headers as any)['x-gateway-secret'];
    if (gatewaySecret !== process.env.GATEWAY_SECRET) {
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
            return reply.send({ conversations });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to get conversations');
            return reply.code(500).send({ error: 'Failed to fetch conversations' });
        }
    });

    // Get messages from a specific conversation
    app.get('/chat/conversations/:id/messages', async (request: any, reply: any) => {
        try {
            const userId = validateGatewayAuth(request, reply);
            if (userId === null) return;

            const conversationId = parseInt((request.params as any).id);
            const limit = parseInt((request.query as any).limit || '50');

            // Verify user is participant in this conversation
            const isParticipant = await conversationRepo.isUserInConversation(conversationId, userId);
            if (!isParticipant) {
                return reply.code(403).send({ error: 'Not a participant in this conversation' });
            }

            const messages = await messageRepo.getMessagesByConversation(conversationId, limit);
            return reply.send({ messages });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to get conversation messages');
            return reply.code(500).send({ error: 'Failed to fetch messages' });
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
