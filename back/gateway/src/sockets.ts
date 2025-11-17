import { FastifyInstance } from "fastify";
import websocketPlugin from "@fastify/websocket";
import jwt from "jsonwebtoken";
import { WebSocket } from "ws";


const JWT_SECRET = process.env.JWT_SECRET as string;

interface PlayerPayload {
	sub: number;
	username: string;
}

interface JoinMatchPayload {
	id: number;
	name: string;
}

export async function registerGatewayWebSocket(server: FastifyInstance) {
	await server.register(websocketPlugin);

	// Map userId → Set of WebSocket connections
	const userSockets = new Map<number, Set<WebSocket>>();

	// Map matchId → Set of player userIds
	const matchPlayers = new Map<number, Set<number>>();

	server.get("/ws", { websocket: true }, (socket, req) => {

		// JWT from query parameter
		const { token } = req.query as { token?: string };
		if (!token) {
			socket.send(JSON.stringify({ error: "Unauthorized" }));
			socket.close();
			return;
		}
		let decoded;
		try {
			decoded = jwt.verify(token.toString(), JWT_SECRET);
		} catch {
			socket.close();
			return;
		}

		if (!isPlayerPayload(decoded)) {
			socket.close();
			return;
		}

		const user = decoded; // fully typed 👍


		const userId = user.sub;
		if (!userSockets.has(userId)) userSockets.set(userId, new Set());
		userSockets.get(userId)!.add(socket);

		console.log(`socket User connected: ${userId} (sockets: ${userSockets.get(userId)!.size})`);

		socket.on("message", (msg: Buffer) => {
			try {
				const text = msg.toString('utf8');
				const data = JSON.parse(text);

				if (data.type === "join_match") {
					const payload: JoinMatchPayload = data.payload;
					if (!matchPlayers.has(payload.id)) matchPlayers.set(payload.id, new Set());
					matchPlayers.get(payload.id)!.add(userId);

					console.log(`User ${userId} joined match ${payload.name}`);

					// Broadcast to everyone in the room
					const players = matchPlayers.get(payload.id)!;
					players.forEach((uid) => {
						userSockets.get(uid)?.forEach((s) => {
							if (s.readyState === WebSocket.OPEN) {
								s.send(JSON.stringify({
									type: "player_joined",
									matchId: payload.id,
									name: payload.name,
									userId,
									alias: user.username
								}));
							}
						});
					});
				}

				// if (data.type === "start_match") {
				// 	const matchId = data.matchId;
				// 	const players = matchPlayers.get(matchId);
				// 	if (!players || !players.has(userId)) return;

				// 	if (players.size < 2) {
				// 		socket.send(JSON.stringify({ error: "Not enough players to start" }));
				// 		return;
				// 	}

				// 	console.log(`Match ${matchId} started by ${userId}`);

				// 	players.forEach((uid) => {
				// 		userSockets.get(uid)?.forEach((s) => {
				// 			s.send(JSON.stringify({ type: "match_started", id: matchId }));
				// 		});
				// 	});
				// }

			} catch (err) {
				console.error("Failed to parse socket message", err);
			}
		});

		socket.on("close", () => {
			const sockets = userSockets.get(userId);
			if (sockets) {
				sockets.delete(socket);
				if (sockets.size === 0) userSockets.delete(userId);
			}
			console.log(`User ${userId} disconnected`);
		});
		socket.on("error", (error) => {
			console.error(`WebSocket error for user ${userId}:`, error);
		});
	});

	console.log("WebSocket Gateway registered.");
}

function isPlayerPayload(obj: any): obj is PlayerPayload {
	return (
		obj &&
		typeof obj === "object" &&
		typeof obj.sub === "number" &&
		typeof obj.username === "string"
	);
}
