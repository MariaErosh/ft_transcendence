import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { WebSocket } from 'ws';
import { initDB, db } from './db/database';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3005');
const connectedClients = new Map<string, WebSocket>();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Broadcast message to all connected clients
 */
function broadcastMessage(message: any, excludeUsername?: string) {
    const messageStr = JSON.stringify(message);

    connectedClients.forEach((clientSocket, clientUsername) => {
        if (excludeUsername && clientUsername === excludeUsername) {
            return;
        }

        if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(messageStr);
        }
    });
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
 * Save message to database and broadcast to all clients
 */
function handleChatMessage(
    userId: number,
    username: string,
    content: string,
    socket: WebSocket,
    logger: any
) {
    const timestamp = Date.now();

    db.run(
        'INSERT INTO messages (user_id, username, content, created_at) VALUES (?, ?, ?, ?)',
        [userId, username, content, timestamp],
        (err: any) => {
            if (err) {
                logger.error({ err }, 'Failed to save message');
                socket.send(JSON.stringify({
                    type: 'error',
                    content: 'Failed to save message',
                }));
            } else {
                logger.info({ username, content }, 'Message saved, broadcasting to clients');
                broadcastMessage({
                    type: 'message',
                    user_id: userId,
                    username: username,
                    content: content,
                    created_at: timestamp,
                });
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
            handleChatMessage(userId, username, message.content.trim(), socket, logger);
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

    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM messages ORDER BY created_at DESC LIMIT 50',
            [],
            (err: any, rows: any) => {
                if (err) {
                    logger.error({ err }, 'Database error');
                    reply.code(500).send({ error: 'Failed to fetch messages' });
                    reject(err);
                } else {
                    const messages = (rows as any[]).reverse();
                    reply.send({ messages });
                    resolve(messages);
                }
            }
        );
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
            connectedClients.set(username, socket);

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

    // REST API: Get message history
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
