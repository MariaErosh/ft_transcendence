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
            try {
                const response = await fetch(`${USER_URL}/users/${userId}`, {
                    headers: {
                        'x-gateway-secret': GATEWAY_SECRET || ''
                    }
                });
                if (response.ok) {
                    const userInfo = await response.json();
                    return reply.send({
                        ...profile,
                        username: userInfo.username,
                        email: userInfo.email,
                        games_played: userInfo.games_played || 0,
                        games_won: userInfo.games_won || 0
                    });
                }
            } catch (err) {
                console.error('Failed to fetch user info:', err);
            }

            return reply.send(profile);
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
            try {
                const response = await fetch(`${USER_URL}/users/${userId}`, {
                    headers: {
                        'x-gateway-secret': GATEWAY_SECRET || ''
                    }
                });
                if (response.ok) {
                    const userInfo = await response.json();
                    return reply.send({
                        ...profile,
                        username: userInfo.username,
                        email: userInfo.email,
                        games_played: userInfo.games_played || 0,
                        games_won: userInfo.games_won || 0
                    });
                }
            } catch (err) {
                console.error('Failed to fetch user info:', err);
            }

            return reply.send(profile);
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

            const { bio, avatar_url, status } = request.body as any;

            // Ensure profile exists
            await profileRepo.getOrCreateProfile(userId);

            // Update profile
            await profileRepo.updateProfile(userId, { bio, avatar_url, status });

            return reply.send({ success: true, message: 'Profile updated successfully' });
        } catch (error: any) {
            app.log.error({ error: error.message }, 'Failed to update profile');
            return reply.code(500).send({ error: 'Failed to update profile' });
        }
    });
}
