import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import "@fastify/websocket";

/**
 * Register Chat WebSocket Proxy
 *
 * This creates a simple bidirectional tunnel between:
 * - Frontend: ws://localhost:3000/ws/chat?token=xxx
 * - Chat Service: ws://chat:3005/ws?token=xxx
 *
 * The gateway just forwards messages both ways without processing them.
 * The chat service handles all authentication and message logic.
 */
export async function registerChatWebSocket(server: FastifyInstance) {
	const CHAT_URL = process.env.CHAT_URL ?? "http://localhost:3005";

	server.get("/ws/chat", { websocket: true }, (socket, request) => { // hacerla mas clara de leer, arreglar chat/ws
		const token = (request.query as any).token;

		if (!token) {
			socket.send(JSON.stringify({ type: "error", message: "No token provided" }));
			socket.close();
			return;
		}

		// Create WebSocket connection to chat service
		// Convert http://chat:3005 → ws://chat:3005/ws?token=xxx
		const chatWsUrl = `${CHAT_URL.replace('http', 'ws')}/ws?token=${token}`;
		const chatSocket = new WebSocket(chatWsUrl);

		console.log(`Chat WebSocket: Proxying connection with token to ${chatWsUrl}`);

		// Forward messages: Frontend → Gateway → Chat Service
		socket.on("message", (msg) => {
			if (chatSocket.readyState === WebSocket.OPEN) {
				chatSocket.send(msg);
			}
		});

		// Forward messages: Chat Service → Gateway → Frontend
		chatSocket.on("message", (msg) => {
			if (socket.readyState === WebSocket.OPEN) {
				socket.send(msg);
			}
		});

		// Handle disconnections - keep both sides in sync
		socket.on("close", () => {
			console.log("Chat WebSocket: Frontend disconnected, closing chat service connection");
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

	console.log("Chat WebSocket registered at /ws/chat");
}
