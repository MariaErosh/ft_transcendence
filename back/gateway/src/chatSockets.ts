import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { PlayerPayload } from "lobbySockets";
import "@fastify/websocket";
import { requiredEnv } from "./index.js";
import { GATEWAY_SECRET } from "./index.js";

/**
 * Register Chat WebSocket Proxy
 *
 * This creates a simple bidirectional tunnel between:
 * - Frontend: ws://localhost:3000/chat/ws?token=xxx
 * - Chat Service: ws://chat:3005/ws?token=xxx
 *
 * The gateway just forwards messages both ways without processing them.
 * The chat service handles all authentication and message logic.
 */
export async function registerChatWebSocket(server: FastifyInstance) {
	const CHAT_URL = requiredEnv("CHAT_SERVICE") + requiredEnv("CHAT_PORT");

	server.get("/chat/ws", { websocket: true }, (socket, request) => {
		const token = (request.query as any).token;

		if (!token) {
			socket.send(JSON.stringify({ type: "error", message: "No token provided" }));
			socket.close();
			return;
		}

		//Verify JWT token
		let player: PlayerPayload | null = null;
		try {
			player = server.jwt.verify<PlayerPayload>(token);
			console.log("Chat WebSocket: Token verified", player);
		} catch (err) {
			socket.send(JSON.stringify({ type: "error", message: "Unauthorized" }));
			console.log("Chat WebSocket: Couldn't parse token", err);
			socket.close();
			return;
		}
		// Create WebSocket connection to chat service
		// Pass userID and username to chat service
		// Convert http://chat:3005 → ws://chat:3005/
		const chatWsUrl = `${CHAT_URL.replace('http', 'ws')}/ws?userId=${player!.sub}&username=${encodeURIComponent(player!.username)}`;

		const chatSocket = new WebSocket(chatWsUrl, {
			headers: {
				'x-gateway-secret': GATEWAY_SECRET
			}
		});

		console.log(`Chat WebSocket: User ${player.username} connecting to ${chatWsUrl}`);

		// Forward messages: Frontend → Gateway → Chat Service (bidirectionally)
		socket.on("message", (msg: any) => {
			if (chatSocket.readyState === WebSocket.OPEN) {
				chatSocket.send(msg);
			}
		});

		// Forward messages: Chat Service → Gateway → Frontend
		chatSocket.on("message", (msg: any) => {
			if (socket.readyState === WebSocket.OPEN) {
				// Convert Buffer to string if needed
				const messageStr = typeof msg === 'string' ? msg : msg.toString();
				socket.send(messageStr);
			}
		});

		// Handle disconnections - keep both sides in sync
		socket.on("close", () => {
			console.log(`Chat WebSocket: User ${player!.username} disconnected`);
			chatSocket.close();
		});

		chatSocket.on("close", () => {
			console.log("Chat WebSocket: Chat service disconnected, closing frontend connection");
			socket.close();
		});

		// Handle errors
		chatSocket.on("error", (err) => {
			console.error("Chat WebSocket: Error from chat service:", err);
			socket.close();
		});

		socket.on("error", (err) => {
			console.error("Chat WebSocket: Error from frontend:", err);
			chatSocket.close();
		});
	});

	console.log("Chat WebSocket registered at /chat/ws");
}
