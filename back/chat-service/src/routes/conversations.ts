import { FastifyInstance } from 'fastify';
import * as conversationRepo from '../repositories/conversationRepository';
import * as messageRepo from '../repositories/messageRepository';

export function registerConversationRoutes(app: FastifyInstance) {
    // Get all conversations for the current user
    app.get('/chat/conversations', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
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
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
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
}
