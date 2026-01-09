import { FastifyInstance } from 'fastify';
import * as notificationRepo from '../repositories/notificationRepository';

export function registerNotificationRoutes(app: FastifyInstance, sendMessageToUser: (userId: number, message: any) => boolean) {
    // Get user notifications
    app.get('/chat/notifications', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
            const unreadOnly = (request.query as any).unreadOnly === 'true';

            const notifications = unreadOnly
                ? await notificationRepo.getUnreadNotifications(userId)
                : await notificationRepo.getUserNotifications(userId);

            return reply.send({ notifications });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to get notifications');
            return reply.code(500).send({ error: 'Failed to fetch notifications' });
        }
    });

    // Get unread notification count
    app.get('/chat/notifications/unread/count', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
            const count = await notificationRepo.getUnreadCount(userId);

            return reply.send({ count });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to get unread count');
            return reply.code(500).send({ error: 'Failed to fetch count' });
        }
    });

    // Mark notification as read
    app.put('/chat/notifications/:id/read', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
            const notificationId = parseInt((request.params as any).id);

            // Verify notification belongs to user
            const notification = await notificationRepo.getNotificationById(notificationId);
            if (!notification) {
                return reply.code(404).send({ error: 'Notification not found' });
            }

            if (notification.user_id !== userId) {
                return reply.code(403).send({ error: 'Not authorized' });
            }

            await notificationRepo.markAsRead(notificationId);
            return reply.send({ success: true });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to mark notification as read');
            return reply.code(500).send({ error: 'Failed to update notification' });
        }
    });

    // Mark all notifications as read
    app.put('/chat/notifications/read-all', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
            await notificationRepo.markAllAsRead(userId);
            return reply.send({ success: true });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to mark all as read');
            return reply.code(500).send({ error: 'Failed to update notifications' });
        }
    });

    // Game result notification (called by match-service via gateway)
    app.post('/chat/notifications/game-result', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const { winnerId, loserId, gameId } = request.body;

            // Send to winner
            const sentToWinner = sendMessageToUser(winnerId, {
                type: 'game_notification',
                subType: 'victory',
                gameId,
                message: '🎉 You won the game!',
                timestamp: Date.now()
            });

            // Send to loser
            const sentToLoser = sendMessageToUser(loserId, {
                type: 'game_notification',
                subType: 'defeat',
                gameId,
                message: '😔 You lost the game',
                timestamp: Date.now()
            });

            // Store notifications in DB for offline users
            if (!sentToWinner) {
                await notificationRepo.createNotification({
                    userId: winnerId,
                    type: 'game_result',
                    payload: { result: 'victory', gameId }
                });
            }

            if (!sentToLoser) {
                await notificationRepo.createNotification({
                    userId: loserId,
                    type: 'game_result',
                    payload: { result: 'defeat', gameId }
                });
            }

            return reply.send({ success: true });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to send game result notification');
            return reply.code(500).send({ error: 'Failed to send notification' });
        }
    });

    // Tournament round notification
    app.post('/chat/notifications/tournament-round', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const { matchId, round, playerIds } = request.body;

            for (const playerId of playerIds) {
                const sent = sendMessageToUser(playerId, {
                    type: 'game_notification',
                    subType: 'tournament_round',
                    matchId,
                    round,
                    message: `🏆 Tournament Round ${round} completed!`,
                    timestamp: Date.now()
                });

                // Store in DB if user is offline
                if (!sent) {
                    await notificationRepo.createNotification({
                        userId: playerId,
                        type: 'tournament_round',
                        payload: { matchId, round }
                    });
                }
            }

            return reply.send({ success: true });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to send tournament round notification');
            return reply.code(500).send({ error: 'Failed to send notification' });
        }
    });

    // Match starting soon notification
    app.post('/chat/notifications/match-starting', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const { playerIds, matchId, matchName, timeUntilStart } = request.body;

            for (const playerId of playerIds) {
                const sent = sendMessageToUser(playerId, {
                    type: 'game_notification',
                    subType: 'match_starting',
                    matchId,
                    matchName,
                    timeUntilStart,
                    message: `⏰ Match "${matchName}" starts in ${timeUntilStart} seconds!`,
                    timestamp: Date.now()
                });

                // Store in DB if user is offline
                if (!sent) {
                    await notificationRepo.createNotification({
                        userId: playerId,
                        type: 'match_starting',
                        payload: { matchId, matchName, timeUntilStart }
                    });
                }
            }

            return reply.send({ success: true });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to send match starting notification');
            return reply.code(500).send({ error: 'Failed to send notification' });
        }
    });
}
