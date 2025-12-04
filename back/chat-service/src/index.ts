import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { WebSocket } from 'ws';
import { initDB, db } from './db/database';

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
 * Send direct message to specific user
 */
function sendDirectMessage(recipientUsername: string, message: any): boolean {
    const recipient = connectedClients.get(recipientUsername);
    if (recipient && recipient.socket.readyState === WebSocket.OPEN) {
        recipient.socket.send(JSON.stringify(message));
        return true;
    }
    return false;
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
 * Save message to database and broadcast to all clients or send DM
 */
function handleChatMessage(
    userId: number,
    username: string,
    content: string,
    recipientId: number | null,
    recipientUsername: string | null,
    socket: WebSocket,
    logger: any
) {
    const timestamp = Date.now();

    db.run(
        'INSERT INTO messages (user_id, username, content, created_at, recipient_id) VALUES (?, ?, ?, ?, ?)',
        [userId, username, content, timestamp, recipientId],
        (err: any) => {
            if (err) {
                logger.error({ err }, 'Failed to save message');
                socket.send(JSON.stringify({
                    type: 'error',
                    content: 'Failed to save message',
                }));
            } else {
                const messageData = {
                    type: 'message',
                    user_id: userId,
                    username: username,
                    content: content,
                    created_at: timestamp,
                    recipient_id: recipientId,
                    isDM: !!recipientId,
                };

                if (recipientId && recipientUsername) {
                    // Direct message - send to recipient only
                    logger.info({ username, recipientUsername, content }, 'DM saved, sending to recipient');
                    const sent = sendDirectMessage(recipientUsername, messageData);

                    // Also send back to sender for confirmation
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify(messageData));
                    }

                    if (!sent) {
                        socket.send(JSON.stringify({
                            type: 'error',
                            content: `User ${recipientUsername} is offline`,
                        }));
                    }
                } else {
                    // Public message - broadcast to all
                    logger.info({ username, content }, 'Message saved, broadcasting to clients');
                    broadcastMessage(messageData);
                }
            }
        }
    );
}

/**
 * Handle incoming WebSocket message
 */
function handleIncomingMessage(
    data: Buffer,
    userId: number,
    username: string,
    socket: WebSocket,
    logger: any
) {
    try {
        const message = JSON.parse(data.toString());
        logger.info({ username, message }, 'Received message from client');

        if (message.content && message.content.trim()) {
            const recipientId = message.recipientId || null;
            const recipientUsername = message.recipientUsername || null;
            handleChatMessage(
                userId,
                username,
                message.content.trim(),
                recipientId,
                recipientUsername,
                socket,
                logger
            );
        }
    } catch (error) {
        logger.error({ error }, 'Error processing message');
    }
}

/**
 * Handle WebSocket connection close
 */
function handleDisconnect(username: string, logger: any) {
    logger.info(`WebSocket disconnected: ${username}`);
    connectedClients.delete(username);
    notifyUserLeft(username);
	}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * REST endpoint: Get message history
 */
async function getMessageHistory(request: any, reply: any, logger: any) {
    // Verify request is from gateway with valid authentication
    const gatewaySecret = (request.headers as any)['x-gateway-secret'];
    if (gatewaySecret !== process.env.GATEWAY_SECRET) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
    }

    const userId = (request.headers as any)['x-user-id'];
    const recipientId = (request.query as any).recipientId;

    return new Promise((resolve, reject) => {
        let query: string;
        let params: any[];

        if (recipientId) {
            // Get DM thread between current user and recipient
            query = `
                SELECT * FROM messages
                WHERE
                    (user_id = ? AND recipient_id = ?) OR
                    (user_id = ? AND recipient_id = ?)
                ORDER BY created_at DESC
                LIMIT 50
            `;
            params = [userId, recipientId, recipientId, userId];
        } else {
            // Get public messages only (recipient_id IS NULL)
            query = 'SELECT * FROM messages WHERE recipient_id IS NULL ORDER BY created_at DESC LIMIT 50';
            params = [];
        }

        db.all(query, params, (err: any, rows: any) => {
            if (err) {
                logger.error({ err }, 'Database error');
                reply.code(500).send({ error: 'Failed to fetch messages' });
                reject(err);
            } else {
                const messages = (rows as any[]).reverse();
                reply.send({ messages });
                resolve(messages);
            }
        });
    });
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
                handleIncomingMessage(data, userId, username, socket, app.log);
            });

            // Handle disconnect
            socket.on('close', () => {
                handleDisconnect(username, app.log);
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

    // REST API: Get online users
    app.get('/chat/users/online', async (request: any, reply: any) => {
        // Verify request is from gateway
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

    // REST API: Get message history (public or DM thread)
    app.get('/chat/messages', async (request: any, reply: any) => {
        return getMessageHistory(request, reply, app.log);
    });

    // WebSocket endpoint: Real-time chat
    registerChatWebSocket(app);

    // Start the server
    await app.listen({ port: PORT, host: '0.0.0.0' });
}

start().catch(err => {
    console.error(err);
    process.exit(1);
});
