import { FastifyInstance } from 'fastify';
import * as blockRepo from '../repositories/blockRepository';

export function registerBlockRoutes(app: FastifyInstance) {
    // Block a user
    app.post('/chat/blocks', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
            const { blockedId } = request.body as any;

            if (!blockedId) {
                return reply.code(400).send({ error: 'blockedId is required' });
            }

            if (userId === parseInt(blockedId)) {
                return reply.code(400).send({ error: 'Cannot block yourself' });
            }

            await blockRepo.blockUser(userId, parseInt(blockedId));
            return reply.send({ success: true, message: 'User blocked successfully' });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to block user');
            if (error.message.includes('already blocked')) {
                return reply.code(409).send({ error: error.message });
            }
            return reply.code(500).send({ error: 'Failed to block user' });
        }
    });

    // Unblock a user
    app.delete('/chat/blocks/:userId', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
            const blockedId = parseInt((request.params as any).userId);

            await blockRepo.unblockUser(userId, blockedId);
            return reply.send({ success: true, message: 'User unblocked successfully' });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to unblock user');
            return reply.code(500).send({ error: 'Failed to unblock user' });
        }
    });

    // Get list of blocked users
    app.get('/chat/blocks', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
            const blockedUserIds = await blockRepo.getBlockedUsers(userId);
            return reply.send({ blockedUsers: blockedUserIds });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to get blocked users');
            return reply.code(500).send({ error: 'Failed to fetch blocked users' });
        }
    });
}
