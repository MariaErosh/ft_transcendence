import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { PlayerPayload } from "lobbySockets";
import "@fastify/websocket";

/**
 * Register Chat WebSocket Proxy
 *
 * This creates a bidirectional tunnel between:
 * - Frontend: ws://localhost:3000/chat/ws (token sent as first message)
 * - Chat Service: ws://chat:3005/ws?userId=xxx&username=xxx
 *
 * The gateway handles authentication and then forwards messages both ways.
 * The chat service receives authenticated userId and username.
 */
export async function registerChatWebSocket(server: FastifyInstance) {
	const CHAT_URL = process.env.CHAT_URL ?? "http://localhost:3005";

	server.get("/chat/ws", { websocket: true }, (socket, request) => {
		let authenticated = false;
		let player: PlayerPayload | null = null;
		let chatSocket: WebSocket | null = null;

		// Handle first message for authentication
		const authenticateConnection = (data: Buffer) => {
			try {
				const message = JSON.parse(data.toString());
				
				if (message.type !== 'auth' || !message.token) {
					socket.send(JSON.stringify({ type: "auth_error", content: "Authentication required" }));
					socket.close();
					return;
				}

				// Verify JWT token
				try {
					player = server.jwt.verify<PlayerPayload>(message.token);
					console.log("Chat WebSocket: Token verified", player);
				} catch (err) {
					socket.send(JSON.stringify({ type: "auth_error", content: "Invalid token" }));
					console.log("Chat WebSocket: Couldn't parse token", err);
					socket.close();
					return;
				}

				// Mark as authenticated
				authenticated = true;

				// Create WebSocket connection to chat service
				// Pass userID and username to chat service
				// Convert http://chat:3005 → ws://chat:3005/
				const chatWsUrl = `${CHAT_URL.replace('http', 'ws')}/ws?userId=${player!.sub}&username=${encodeURIComponent(player!.username)}`;

				chatSocket = new WebSocket(chatWsUrl, {
					headers: {
						'x-gateway-secret': process.env.GATEWAY_SECRET || ''
					}
				});

				console.log(`Chat WebSocket: User ${player!.username} connecting to ${chatWsUrl}`);

				// Send authentication success to client
				socket.send(JSON.stringify({ type: "auth_success" }));

				// Forward messages: Frontend → Gateway → Chat Service
				socket.on("message", (msg: any) => {
					if (authenticated && chatSocket && chatSocket.readyState === WebSocket.OPEN) {
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
				const handleSocketClose = () => {
					console.log(`Chat WebSocket: User ${player!.username} disconnected`);
					if (chatSocket) {
						chatSocket.close();
					}
				};

				const handleChatClose = () => {
					console.log("Chat WebSocket: Chat service disconnected, closing frontend connection");
					socket.close();
				};

				socket.on("close", handleSocketClose);
				chatSocket.on("close", handleChatClose);

				// Handle errors
				chatSocket.on("error", (err) => {
					console.error("Chat WebSocket: Error from chat service:", err);
					socket.close();
				});

			} catch (err) {
				console.error("Chat WebSocket: Authentication error:", err);
				socket.send(JSON.stringify({ type: "auth_error", content: "Authentication failed" }));
				socket.close();
			}
		};

		// Wait for authentication message
		socket.once("message", authenticateConnection);

		// Handle errors on the frontend socket
		socket.on("error", (err) => {
			console.error("Chat WebSocket: Error from frontend:", err);
			if (chatSocket) {
				chatSocket.close();
			}
		});
	});

	console.log("Chat WebSocket registered at /chat/ws");
}
