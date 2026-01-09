import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { WebSocket } from 'ws';
import { initDB } from './db/database';
import { registerConversationRoutes } from './routes/conversations';
import { registerBlockRoutes } from './routes/blocks';
import { registerInvitationRoutes } from './routes/invitations';
import { registerNotificationRoutes } from './routes/notifications';
import { registerMessageRoutes } from './routes/messages';
import { sendMessageToUser, handleIncomingMessage, clearUserTypingTimeouts } from './websocket/chatHandler';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3005');

interface ConnectedUser {
    socket: WebSocket;
    userId: number;
    username: string;
}

const connectedClients = new Map<string, ConnectedUser>();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Broadcast message to all connected clients
 */
function broadcastMessage(message: any, excludeUsername?: string) {
    const messageStr = JSON.stringify(message);

    connectedClients.forEach((client, clientUsername) => {
        if (excludeUsername && clientUsername === excludeUsername) {
            return;
        }

        if (client.socket.readyState === WebSocket.OPEN) {
            client.socket.send(messageStr);
        }
    });
}

/**
 * Helper wrapper to call sendMessageToUser with connectedClients
 */
function sendToUser(userId: number, message: any): boolean {
    return sendMessageToUser(connectedClients, userId, message);
}

/**
 * Validate WebSocket connection credentials
 */
function validateConnection(request: any): { userId: number; username: string } | null {
    const userId = parseInt((request.query as any).userId);
    const username = (request.query as any).username;

    if (!userId || !username) {
        return null;
    }

    // Verify request is from gateway
    const gatewaySecret = (request.headers as any)['x-gateway-secret'];
    if (gatewaySecret !== process.env.GATEWAY_SECRET) {
        return null;
    }

    return { userId, username };
}

/**
 * Send welcome message to newly connected user
 */
function sendWelcomeMessage(socket: WebSocket, username: string) {
    socket.send(JSON.stringify({
        type: 'system',
        content: `Welcome to the chat, ${username}!`,
        timestamp: Date.now(),
    }));
}

/**
 * Notify all users that someone joined
 */
function notifyUserJoined(username: string) {
    broadcastMessage({
        type: 'system',
        content: `${username} joined the chat`,
        timestamp: Date.now(),
    }, username);
}

/**
 * Notify all users that someone left
 */
function notifyUserLeft(username: string) {
    broadcastMessage({
        type: 'system',
        content: `${username} left the chat`,
        timestamp: Date.now(),
    });
}

/**
 * Handle WebSocket connection close
 */
function handleDisconnect(userId: number, username: string, logger: any) {
    logger.info(`WebSocket disconnected: ${username}`);
    
    // Clear any pending typing timeouts
    clearUserTypingTimeouts(userId);
    
    // Remove from connected clients
    connectedClients.delete(username);
    notifyUserLeft(username);
}

/**
 * WebSocket endpoint: Real-time chat
 */
function registerChatWebSocket(app: any) {
    app.register(async function (app: any) {
        app.get('/ws', { websocket: true }, (socket: WebSocket, request: any) => {
            // Validate connection credentials
            const credentials = validateConnection(request);
            if (!credentials) {
                app.log.warn('WebSocket connection rejected: Invalid credentials');
                socket.close(1008, 'Unauthorized');
                return;
            }

            const { userId, username } = credentials;
            app.log.info(`WebSocket connected: ${username} (id: ${userId})`);

            // Register client
            connectedClients.set(username, {
                socket,
                userId,
                username,
            });

            // Send welcome and notify others
            sendWelcomeMessage(socket, username);
            notifyUserJoined(username);

            // Handle incoming messages
            socket.on('message', (data: Buffer) => {
                handleIncomingMessage(data, userId, username, socket, app.log, connectedClients);
            });

            // Handle disconnect
            socket.on('close', () => {
                handleDisconnect(userId, username, app.log);
            });

            // Handle errors
            socket.on('error', (error: any) => {
                app.log.error({ error, username }, 'WebSocket error');
            });
        });
    });
}

// ============================================================================
// Server Setup
// ============================================================================

async function start() {
    await initDB();

    const app = Fastify({ logger: true });

    // Register plugins
    app.register(cors, { origin: true, credentials: true });
    app.register(websocket);

    // Health check
    app.get('/health', async () => ({ status: 'ok', service: 'chat-service' }));

    // Get online users
    app.get('/chat/users/online', async (request: any, reply: any) => {
        const gatewaySecret = (request.headers as any)['x-gateway-secret'];
        if (gatewaySecret !== process.env.GATEWAY_SECRET) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        const onlineUsers = Array.from(connectedClients.values()).map(client => ({
            userId: client.userId,
            username: client.username,
        }));

        return reply.send({ users: onlineUsers });
    });

    // Register route modules
    registerMessageRoutes(app);
    registerConversationRoutes(app, sendToUser);
    registerBlockRoutes(app);
    registerInvitationRoutes(app, sendToUser);
    registerNotificationRoutes(app, sendToUser);

    // Register WebSocket
    registerChatWebSocket(app);

    // Start server
    try {
        await app.listen({ port: PORT, host: '0.0.0.0' });
        app.log.info(`Chat service running on port ${PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

start();