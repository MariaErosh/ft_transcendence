import { FastifyInstance } from 'fastify';
import * as notificationRepo from '../repositories/notificationRepository';
import { GATEWAY_SECRET } from "../index.js";

export function registerNotificationRoutes(app: FastifyInstance) {
    // Get user notifications
    app.get('/chat/notifications', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== GATEWAY_SECRET) {
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
            if (gatewaySecret !== GATEWAY_SECRET) {
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
            if (gatewaySecret !== GATEWAY_SECRET) {
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
            if (gatewaySecret !== GATEWAY_SECRET) {
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
}
