import { FastifyInstance } from "fastify";
import websocketPlugin from "@fastify/websocket";
import { WebSocket } from "ws";

interface PlayerPayload {
	sub: number;
	username: string;
}

const matchPlayers = new Map<string, Set<number>>();
const userInfo = new Map<number, string>();
export function getOpenMatches(){ return Array.from(matchPlayers.keys())}
export function getMatchPlayers(matchName:string){
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

		socket.on("message", (msg: Buffer) => {
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

				if (data.type === "new_match"){
					if (!matchPlayers.has(data.name)) matchPlayers.set(data.name, new Set());
				else {
					socket.send(JSON.stringify({ error: "Match already exists" }));
					console.log("MATCH ALREADY EXISTS");
				}
				}

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
