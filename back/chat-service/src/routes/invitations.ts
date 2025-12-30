import { FastifyInstance } from 'fastify';
import * as blockRepo from '../repositories/blockRepository';
import * as invitationRepo from '../repositories/invitationRepository';
import * as notificationRepo from '../repositories/notificationRepository';

export function registerInvitationRoutes(app: FastifyInstance, sendMessageToUser: (userId: number, message: any) => boolean) {
    // Send game invitation
    app.post('/chat/invitations/game', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const senderId = parseInt((request.headers as any)['x-user-id']);
            const { receiverId } = request.body as any;

            if (!receiverId) {
                return reply.code(400).send({ error: 'receiverId is required' });
            }

            if (senderId === parseInt(receiverId)) {
                return reply.code(400).send({ error: 'Cannot invite yourself' });
            }

            // Check if users have blocked each other
            const blocked = await blockRepo.areUsersBlocked(senderId, parseInt(receiverId));
            if (blocked) {
                return reply.code(403).send({ error: 'Cannot send invitation to this user' });
            }

            // Check if there's already a pending invitation
            const hasPending = await invitationRepo.hasPendingInvitation(senderId, parseInt(receiverId));
            if (hasPending) {
                return reply.code(409).send({ error: 'Invitation already pending' });
            }

            const invitationId = await invitationRepo.createInvitation({
                senderId,
                receiverId: parseInt(receiverId),
            });

            // Create notification for receiver
            await notificationRepo.createNotification({
                userId: parseInt(receiverId),
                type: 'game_invitation',
                payload: { invitationId, senderId },
            });

            // Send real-time notification if receiver is online
            sendMessageToUser(parseInt(receiverId), {
                type: 'game_invitation',
                invitationId,
                senderId,
            });

            return reply.send({ success: true, invitationId });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to send game invitation');
            return reply.code(500).send({ error: 'Failed to send invitation' });
        }
    });

    // Get pending invitations
    app.get('/chat/invitations', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
            const status = (request.query as any).status || 'pending';

            const invitations = await invitationRepo.getReceivedInvitations(userId, status as any);
            return reply.send({ invitations });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to get invitations');
            return reply.code(500).send({ error: 'Failed to fetch invitations' });
        }
    });

    // Accept or decline invitation
    app.put('/chat/invitations/:id', async (request: any, reply: any) => {
        try {
            const gatewaySecret = (request.headers as any)['x-gateway-secret'];
            if (gatewaySecret !== process.env.GATEWAY_SECRET) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            const userId = parseInt((request.headers as any)['x-user-id']);
            const invitationId = parseInt((request.params as any).id);
            const { status } = request.body as any;

            if (!status || !['accepted', 'declined'].includes(status)) {
                return reply.code(400).send({ error: 'status must be "accepted" or "declined"' });
            }

            // Get invitation to verify receiver
            const invitation = await invitationRepo.getInvitationById(invitationId);
            if (!invitation) {
                return reply.code(404).send({ error: 'Invitation not found' });
            }

            if (invitation.receiver_id !== userId) {
                return reply.code(403).send({ error: 'Not authorized to modify this invitation' });
            }

            if (invitation.status !== 'pending') {
                return reply.code(400).send({ error: 'Invitation already processed' });
            }

            await invitationRepo.updateInvitationStatus(invitationId, status);

            // Notify sender of response
            await notificationRepo.createNotification({
                userId: invitation.sender_id,
                type: 'invitation_response',
                payload: { invitationId, status, responderId: userId },
            });

            // Send real-time notification
            sendMessageToUser(invitation.sender_id, {
                type: 'invitation_response',
                invitationId,
                status,
                responderId: userId,
            });

            return reply.send({ success: true, invitation });
        } catch (error: any) {
            app.log.error({ error }, 'Failed to update invitation');
            return reply.code(500).send({ error: 'Failed to update invitation' });
        }
    });
}
