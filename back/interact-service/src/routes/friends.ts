import { FastifyInstance } from 'fastify';
import * as friendRepo from '../repositories/friendRepository';
import { GATEWAY_SECRET, USER_URL } from "../index.js";

export function registerFriendRoutes(app: FastifyInstance) {
    // Get user's friends
    app.get('/interact/friends', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
            if (!userId || isNaN(userId)) {
                return reply.code(400).send({ error: 'Invalid user ID' });
            }

            const friendIds = await friendRepo.getFriends(userId);

            // Fetch friend details from user service
            const friends = await Promise.all(
                friendIds.map(async (friendId) => {
                    try {
                        const response = await fetch(`${USER_URL}/users/${friendId}`, {
                            headers: {
                                'x-gateway-secret': GATEWAY_SECRET
                            }
                        });
                        if (response.ok) {
                            return await response.json();
                        }
                        return null;
                    } catch (err) {
                        console.error(`Failed to fetch user ${friendId}:`, err);
                        return null;
                    }
                })
            );

            return reply.send(friends.filter(f => f !== null));
        } catch (error: any) {
            app.log.error({ error: error.message }, 'Failed to get friends');
            return reply.code(500).send({ error: 'Failed to get friends' });
        }
    });

    // Add a friend
    app.post('/interact/friends', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
            const { friendId } = request.body as any;

            if (!userId || isNaN(userId)) {
                return reply.code(400).send({ error: 'Invalid user ID' });
            }

            if (!friendId) {
                return reply.code(400).send({ error: 'friendId is required' });
            }

            if (userId === parseInt(friendId)) {
                return reply.code(400).send({ error: 'Cannot add yourself as a friend' });
            }

            await friendRepo.addFriend(userId, parseInt(friendId));
            return reply.send({ success: true, message: 'Friend added successfully' });
        } catch (error: any) {
            app.log.error({ error: error.message }, 'Failed to add friend');
            if (error.message.includes('already exists')) {
                return reply.code(409).send({ error: error.message });
            }
            return reply.code(500).send({ error: 'Failed to add friend' });
        }
    });

    // Remove a friend
    app.delete('/interact/friends/:friendId', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
            const { friendId } = request.params as any;

            if (!userId || isNaN(userId)) {
                return reply.code(400).send({ error: 'Invalid user ID' });
            }

            await friendRepo.removeFriend(userId, parseInt(friendId));
            return reply.send({ success: true, message: 'Friend removed successfully' });
        } catch (error: any) {
            app.log.error({ error: error.message }, 'Failed to remove friend');
            return reply.code(500).send({ error: 'Failed to remove friend' });
        }
    });

    // Check if users are friends
    app.get('/interact/friends/:friendId/status', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
            const { friendId } = request.params as any;

            if (!userId || isNaN(userId)) {
                return reply.code(400).send({ error: 'Invalid user ID' });
            }

            const areFriends = await friendRepo.areFriends(userId, parseInt(friendId));
            return reply.send({ areFriends });
        } catch (error: any) {
            app.log.error({ error: error.message }, 'Failed to check friendship status');
            return reply.code(500).send({ error: 'Failed to check friendship status' });
        }
    });
}
