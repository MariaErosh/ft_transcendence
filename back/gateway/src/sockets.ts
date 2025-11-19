import { FastifyInstance } from "fastify";
import websocketPlugin from "@fastify/websocket";
import { WebSocket } from "ws";
import dotenv from "dotenv";
interface PlayerPayload {
	sub: number;
	username: string;
}

const matchPlayers = new Map<string, Set<number>>();
const userInfo = new Map<number, string>();
export function getOpenMatches() { return Array.from(matchPlayers.keys()) }
export function getMatchPlayers(matchName: string) {
	const ids = matchPlayers.get(matchName);
	if (!ids) return [];
	return [...ids].map(id => (userInfo.get(id) ?? `User${id}`));
}

export async function registerGatewayWebSocket(server: FastifyInstance) {
	await server.register(websocketPlugin);
	console.log("websocket registered on gateway");

	// Map userId → Set of WebSocket connections
	const userSockets = new Map<number, Set<WebSocket>>();

	// Map matchId → Set of player userIds

	server.get("/ws", { websocket: true }, (socket, req) => {

		// JWT from query parameter
		const token = (req.query as any).token;
		if (!token) {
			socket.send(JSON.stringify({ error: "Unauthorized" }));
			console.log("NO TOKEN PROVIDED");
			socket.close();
			return;
		}
		let player: PlayerPayload | null = null;

		try {
			player = server.jwt.verify<PlayerPayload>(token);
		} catch (err) {
			socket.send(JSON.stringify({ error: "Unauthorized" }));
			console.log("COULDN'T PARSE TOKEN");
			socket.close();
			return;
		}

		const userId = player!.sub;
		if (!userSockets.has(userId)) userSockets.set(userId, new Set());
		userSockets.get(userId)!.add(socket);
		userInfo.set(player!.sub, player!.username);

		console.log(`socket User connected: ${userId} (sockets: ${userSockets.get(userId)!.size})`);

		socket.on("message", async (msg: Buffer) => {
			try {
				const text = msg.toString('utf8');
				const data = JSON.parse(text);

				if (data.type === "join_match") {
					const matchName = data.name;
					if (!matchPlayers.has(matchName)) matchPlayers.set(matchName, new Set());
					matchPlayers.get(matchName)!.add(userId);

					console.log(`User ${userId} joined match ${matchName}`);

					// Broadcast to everyone in the room
					const players = matchPlayers.get(matchName)!;
					players.forEach((uid) => {
						userSockets.get(uid)?.forEach((s) => {
							if (s.readyState === WebSocket.OPEN) {
								s.send(JSON.stringify({
									type: "player_joined",
									name: matchName,
									alias: player!.username
								}));
							}
						});
					});
				}

				if (data.type === "new_match") {
					if (!matchPlayers.has(data.name)) matchPlayers.set(data.name, new Set());
					else {
						socket.send(JSON.stringify({ error: "Match already exists" }));
						console.log("MATCH ALREADY EXISTS");
					}
				}

				if (data.type === "start_match") {
					console.log("Received start_match");
					const playersId = matchPlayers.get(data.name);
					if (!playersId || playersId.size < 2) return;
					const players: { id: number, alias: string }[] = [];
					for (const id of playersId) {
						if (userInfo.get(id) !== undefined)
							players.push({ id: id, alias: userInfo.get(id)! });
					}
					const MATCH_SERVICE_DIRECT = process.env.MATCH_SERVICE_URL ?? "http://match:3004";
					const result = await fetch(`${MATCH_SERVICE_DIRECT}/match/remote/new`, {
						method: "POST",
						headers: { "Content-Type": "application/json", "x-gateway-secret": process.env.GATEWAY_SECRET, },
						body: JSON.stringify({ name: data.name, players: players, type: "REMOTE" })
					});

					const { matchId, games } = await result.json();
					console.log(`Match ${matchId} created with ${games.length} game(s)`);


					for (const game of games) {
						const leftUserId = game.left_player_id;   // number (from DB)
						const rightUserId = game.right_player_id; // number

						// Send to left player
						userSockets.get(leftUserId)?.forEach(ws => {
							if (ws.readyState === WebSocket.OPEN) {
								ws.send(JSON.stringify({
									type: "game_ready",
									gameId: game.id,
									matchNam: data.name,
									side: "left",
									opponent: game.right_player_alias
								}));
							}
						});

						// Send to right player
						userSockets.get(rightUserId)?.forEach(ws => {
							if (ws.readyState === WebSocket.OPEN) {
								ws.send(JSON.stringify({
									type: "game_ready",
									gameId: game.id,
									matchName: data.name,
									side: "right",
									opponent: game.left_player_alias
								}));
							}
						});
					}
					// TO CONSIDER: also broadcast a generic "match_started"
				}

			} catch (err) {
				console.error("Failed to parse socket message", err);
			}
		});

		socket.on("close", () => {
			//REMOVE FROM MATCH AS WELL
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
