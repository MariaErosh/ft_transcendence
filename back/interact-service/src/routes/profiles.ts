import { FastifyInstance } from 'fastify';
import * as profileRepo from '../repositories/profileRepository';
import { GATEWAY_SECRET, USER_URL } from '../index.js';

export function registerProfileRoutes(app: FastifyInstance) {
    // Get user profile
    app.get('/interact/profile/:userId', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const { userId } = request.params as any;
            const profile = await profileRepo.getOrCreateProfile(parseInt(userId));

            // Fetch user info including game stats from user service
            let userInfo = null;
            try {
                const response = await fetch(`${USER_URL}/users/${userId}`, {
                    headers: {
                        'x-gateway-secret': GATEWAY_SECRET || ''
                    }
                });
                if (response.ok) {
                    userInfo = await response.json();
                } else {
                    app.log.warn(`Failed to fetch user info: ${response.status} ${response.statusText}`);
                }
            } catch (err: any) {
                app.log.error({ error: err.message }, 'Failed to fetch user info from user-service');
            }

            // Always return a complete profile with all fields
            return reply.send({
                ...profile,
                username: userInfo?.username || 'Unknown User',
                email: userInfo?.email || '',
                games_played: userInfo?.games_played || 0,
                games_won: userInfo?.games_won || 0
            });
        } catch (error: any) {
            app.log.error({ error: error.message }, 'Failed to get profile');
            return reply.code(500).send({ error: 'Failed to get profile' });
        }
    });

    // Get own profile
    app.get('/interact/profile', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
            if (!userId || isNaN(userId)) {
                return reply.code(400).send({ error: 'Invalid user ID' });
            }

            const profile = await profileRepo.getOrCreateProfile(userId);

            // Fetch user info including game stats
            let userInfo = null;
            try {
                const response = await fetch(`${USER_URL}/users/${userId}`, {
                    headers: {
                        'x-gateway-secret': GATEWAY_SECRET || ''
                    }
                });
                if (response.ok) {
                    userInfo = await response.json();
                } else {
                    app.log.warn(`Failed to fetch user info: ${response.status} ${response.statusText}`);
                }
            } catch (err: any) {
                app.log.error({ error: err.message }, 'Failed to fetch user info from user-service');
            }

            // Always return a complete profile with all fields
            return reply.send({
                ...profile,
                username: userInfo?.username || 'Unknown User',
                email: userInfo?.email || '',
                games_played: userInfo?.games_played || 0,
                games_won: userInfo?.games_won || 0
            });
        } catch (error: any) {
            app.log.error({ error: error.message }, 'Failed to get profile');
            return reply.code(500).send({ error: 'Failed to get profile' });
        }
    });

    // Update own profile
    app.put('/interact/profile', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
            if (!userId || isNaN(userId)) {
                return reply.code(400).send({ error: 'Invalid user ID' });
            }

            const { bio } = request.body as any;

            // Ensure profile exists
            await profileRepo.getOrCreateProfile(userId);

            await profileRepo.updateProfile(userId, bio);

            return reply.send({ success: true, message: 'Profile updated successfully' });
        } catch (error: any) {
            app.log.error({ error: error.message }, 'Failed to update profile');
            return reply.code(500).send({ error: 'Failed to update profile' });
        }
    });
}
