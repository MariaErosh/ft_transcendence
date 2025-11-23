import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import { WebSocket } from 'ws';
import { initDB, db } from './db/database';

// Load environment variables from .env file
dotenv.config();

// Get configuration from environment variables
const PORT = parseInt(process.env.PORT || '3005');
const JWT_SECRET = process.env.JWT_SECRET || '!TheLastProjectIn42!';

// Create Fastify server instance
const app = Fastify({
  logger: true, // Enable logging for debugging
});

// Store all connected WebSocket clients
// Key: username, Value: WebSocket connection
const connectedClients = new Map<string, WebSocket>();

async function start() {
    // Initialize database (create tables if they don't exist)
    await initDB();

    // Register CORS plugin (allows frontend to make requests)
    app.register(cors, {
    origin: true, // Allow all origins (change in production!)
    credentials: true,
    });

    // Register JWT plugin (for token verification)
    app.register(jwt, {
    secret: JWT_SECRET,
    });

    // Register WebSocket plugin
    app.register(websocket);

    // Health check endpoint (useful for Docker health checks)
    app.get('/health', async (request, reply) => {
    return { status: 'ok', service: 'chat-service' };
    });

    // REST API: Get recent chat messages
    // Example: GET http://localhost:3005/chat/messages
    app.get('/chat/messages', async (request, reply) => {
    return new Promise((resolve, reject) => {
        // Get last 50 messages, newest first
        db.all(
        'SELECT * FROM messages ORDER BY created_at DESC LIMIT 50',
        [],
        (err, rows) => {
            if (err) {
            app.log.error({ err }, 'Database error');
            reply.code(500).send({ error: 'Failed to fetch messages' });
            reject(err);
            } else {
            // Reverse array so oldest message is first
            const messages = (rows as any[]).reverse();
            reply.send({ messages });
            resolve(messages);
            }
        }
        );
    });
    });

    // WebSocket endpoint: Real-time chat
    // Clients connect with: ws://localhost:3005/ws?token=JWT_TOKEN
    app.register(async function (app) {
    app.get('/ws', { websocket: true }, (socket, request) => {
        // Extract token from query parameters
        const token = (request.query as any).token;

        if (!token) {
        app.log.warn('WebSocket connection rejected: No token provided');
        socket.close(1008, 'No token provided');
        return;
        }

        try {
        // Verify JWT token
        const decoded = app.jwt.verify(token) as any;
        const userId = decoded.id;
        const username = decoded.username;

        app.log.info(`WebSocket connected: ${username} (id: ${userId})`);

        // Store this client's connection
        connectedClients.set(username, socket);

        // Send welcome message to this client only
        socket.send(
            JSON.stringify({
            type: 'system',
            content: `Welcome to the chat, ${username}!`,
            timestamp: Date.now(),
            })
        );

        // Broadcast to others that user joined
        broadcastMessage(
            {
            type: 'system',
            content: `${username} joined the chat`,
            timestamp: Date.now(),
            },
            username // Don't send to the user who just joined
        );

        // Handle incoming messages from this client
        socket.on('message', (data: Buffer) => {
            try {
            const message = JSON.parse(data.toString());

            if (message.content && message.content.trim()) {
                const content = message.content.trim();
                const timestamp = Date.now();

                // Save message to database
                db.run(
                'INSERT INTO messages (user_id, username, content, created_at) VALUES (?, ?, ?, ?)',
                [userId, username, content, timestamp],
                (err) => {
                    if (err) {
                    app.log.error({ err }, 'Failed to save message');
                    socket.send(
                        JSON.stringify({
                        type: 'error',
                        content: 'Failed to save message',
                        })
                    );
                    } else {
                    // Broadcast message to ALL connected clients (including sender)
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
            } catch (error) {
            app.log.error({ error }, 'Error processing message');
            }
        });

        // Handle client disconnect
        socket.on('close', () => {
            app.log.info(`WebSocket disconnected: ${username}`);
            connectedClients.delete(username);

            // Broadcast to others that user left
            broadcastMessage({
            type: 'system',
            content: `${username} left the chat`,
            timestamp: Date.now(),
            });
        });

        // Handle errors
        socket.on('error', (error) => {
            app.log.error({ error, username }, 'WebSocket error');
        });
        } catch (error) {
        app.log.warn('WebSocket connection rejected: Invalid token');
        socket.close(1008, 'Invalid token');
        }
    });
    });

    // Helper function: Broadcast message to all connected clients
    function broadcastMessage(message: any, excludeUsername?: string) {
    const messageStr = JSON.stringify(message);

    connectedClients.forEach((clientSocket, clientUsername) => {
        // Skip the excluded user (if specified)
        if (excludeUsername && clientUsername === excludeUsername) {
        return;
        }

        // Only send if connection is still open
        if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(messageStr);
        }
    });
    }

    // Start the server
    await app.listen({ port: PORT, host: '0.0.0.0' })
}

start().catch(err => {
    console.error(err);
    process.exit(1);
});
