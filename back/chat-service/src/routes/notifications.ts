import { FastifyInstance } from 'fastify';
import * as notificationRepo from '../repositories/notificationRepository';
import * as conversationRepo from '../repositories/conversationRepository';
import * as messageRepo from '../repositories/messageRepository';
import { GATEWAY_SECRET } from "../index.js";
import { SYSTEM_USER_ID } from '../db/database';

export function registerNotificationRoutes(app: FastifyInstance, sendMessageToUser: (userId: number, message: any) => boolean) {
    app.post('/chat/notifications/game-result', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const { winnerId, loserId, gameId } = request.body;

            await sendSystemMessage(winnerId, '🎉 You won the game!', 'game_result', { result: 'victory', gameId }, sendMessageToUser);
            await sendSystemMessage(loserId, '😔 You lost the game', 'game_result', { result: 'defeat', gameId }, sendMessageToUser);

            return reply.send({ success: true });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to send game result notification');
            return reply.code(500).send({ error: 'Failed to send notification' });
        }
    });

    app.post('/chat/notifications/tournament-round', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const { matchId, round, playerIds } = request.body;

            for (const playerId of playerIds) {
                await sendSystemMessage(
                    playerId,
                    `🏆 Tournament Round ${round} completed!`,
                    'tournament_round',
                    { matchId, round },
                    sendMessageToUser
                );
            }

            return reply.send({ success: true });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to send tournament round notification');
            return reply.code(500).send({ error: 'Failed to send notification' });
        }
    });

    app.post('/chat/notifications/match-joined', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const { playerIds, matchId, matchName, matchType } = request.body;
            const message = matchType === 'tournament'
                ? `🎮 You joined the tournament "${matchName}"!`
                : `🎮 You joined the match "${matchName}"!`;

            for (const playerId of playerIds) {
                await sendSystemMessage(
                    playerId,
                    message,
                    'match_joined',
                    { matchId, matchName, matchType },
                    sendMessageToUser
                );
            }

            return reply.send({ success: true });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to send match joined notification');
            return reply.code(500).send({ error: 'Failed to send notification' });
        }
    });
}

async function sendSystemMessage(
    userId: number,
    content: string,
    notificationType: string,
    payload: any,
    sendMessageToUser: (userId: number, message: any) => boolean
): Promise<void> {
    try {
        const conversationId = await conversationRepo.CreateSystemConversation(userId);

        const messageId = await messageRepo.createMessage({
            conversationId,
            senderId: SYSTEM_USER_ID,
            content,
            messageType: 'system_notification',
            metadata: JSON.stringify({ notificationType, ...payload })
        });

        sendMessageToUser(userId, {
            type: 'system_notification',
            id: messageId,
            conversation_id: conversationId,
            sender_id: SYSTEM_USER_ID,
            sender_username: '🎮 Game System',
            content,
            created_at: new Date().toISOString(),
            metadata: JSON.stringify({ notificationType, ...payload })
        });
    } catch (error: any) {
        console.error('Failed to send system message:', error);
        try {
            await notificationRepo.createNotification({
                userId,
                type: notificationType,
                payload
            });
        } catch (fallbackError) {
            console.error('Critical failure: Fallback notification also failed', fallbackError);
        }
    }
}