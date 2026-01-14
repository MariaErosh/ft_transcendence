import { FastifyInstance } from "fastify";
import websocketPlugin from "@fastify/websocket";
import { WebSocket } from "ws";
import dotenv from "dotenv";
import pino from "pino";
import { MATCH_SERVICE_URL, GATEWAY_SECRET } from "./index.js";

const logger = pino({
	level: 'info',
	transport: {
		targets: [
			{ target: 'pino/file', options: { destination: 1 } },
			{
				target: 'pino-socket',
				options: { address: 'logstash', port: 5000, mode: 'tcp', reconnect: true }
			}
		]
	}
});

export interface PlayerPayload {
	sub: number;
	username: string;
}

interface Match {
	players: Set<PlayerPayload>,
	type: string
	started: boolean;
}

const matches = new Map<string, Match>();
const userSockets = new Map<number, Set<WebSocket>>();

export function getOpenMatches() {
	const result: {name: string; started: boolean }[] = [];

	for (const [name, match] of matches.entries()) {
		if (match.type === "REMOTE") {
			result.push({ name, started: match.started });
		}
	}
	logger.info({ matches: result }, "Remote matches");
	return result;
}

export function getMatchPlayers(matchName: string) {
	const players = matches.get(matchName)?.players;
	if (!players) return [];
	const names: string[] = [];

	for (const player of players) {
		names.push(player.username);
	}
	return names;
}

function playerInAnotherMatch(playerId: number, currentMatch: string): boolean {
	for (const [matchName, values] of matches.entries()) {
		if (matchName === currentMatch) continue;
		for (const player of values.players) {
			if (player.sub === playerId) return true;
		}
	}
	return false;
}

export async function notifyAboutNewConsoleGame(game: any, matchName: string) {
	logger.info({ game }, "New console game notification");
	const players = matches.get(matchName)?.players;
	if (players) {
		for (const player of players)
		{
			const sockets = userSockets.get(player.sub);
			if (sockets) {
				sockets.forEach(ws => {
					if (ws.readyState === WebSocket.OPEN) {
						logger.info(`Sending game_ready to console lobby socket player (userId: ${player.sub})`);
						ws.send(JSON.stringify({
							type: "game_ready",
							gameId: game.id,
							matchName: matchName,
							side: "both",
							right_player: game.right_player_alias,
							left_player: game.left_player_alias
						}));
					}
				});
			} else {
				logger.warn(`Player ${player.sub} has no active sockets`);
			}
		}
	}
}

export async function notifyAboutNewGame(games: any[], matchName: string) {
	for (const game of games) {
		logger.info({ game }, "New game notification");
		const leftUserId = game.left_player_id;
		const rightUserId = game.right_player_id;

		const leftSockets = userSockets.get(leftUserId);
		if (leftSockets) {
			leftSockets.forEach(ws => {
				if (ws.readyState === WebSocket.OPEN) {
					logger.info(`Sending game_ready to left player (userId: ${leftUserId})`);
					ws.send(JSON.stringify({
						type: "game_ready",
						gameId: game.id,
						matchName: matchName,
						side: "left",
						opponent: game.right_player_alias
					}));
				}
			});
		} else {
			logger.warn(`Left player ${leftUserId} has no active sockets`);
		}

		const rightSockets = userSockets.get(rightUserId);
		if (rightSockets) {
			rightSockets.forEach(ws => {
				if (ws.readyState === WebSocket.OPEN) {
					console.log(`Sending game_ready to right player (userId: ${rightUserId})`);
					logger.info(`Sending game_ready to right player (userId: ${rightUserId})`);
					ws.send(JSON.stringify({
						type: "game_ready",
						gameId: game.id,
						matchName: matchName,
						side: "right",
						opponent: game.left_player_alias
					}));
				}
			});
		} else {
			logger.warn(`Right player ${rightUserId} has no active sockets`);
		}
	}
}

export async function notifyEndMatch(matchName: string, matchId: number, winnerAlias: string, winnerId: number){
	const players = matches.get(matchName)?.players;
	if (!players || players.size === 0) return new Error("no sockets for this match");
	for (const player of players) {
		const sockets = userSockets.get(player.sub);
		if (sockets) {
			sockets.forEach(ws => {
				if (ws.readyState === WebSocket.OPEN) {
					logger.info(`Sending end of match to player (userId: ${player.sub})`);
					ws.send(JSON.stringify({
						type: "end_match",
						matchName: matchName,
						winner: winnerAlias
					}));
				}
			});
		} else {
			logger.warn(`Player ${player.sub} has no active sockets`);
		}
	}
	matches.delete(matchName);
}

export async function registerGatewayWebSocket(server: FastifyInstance) {
	await server.register(websocketPlugin);
	server.log.info("websocket registered on gateway");

	server.get("/ws", { websocket: true }, (socket, req) => {

		const token = (req.query as any).token;
		if (!token) {
			socket.send(JSON.stringify({ error: "Unauthorized" }));
			server.log.warn("NO TOKEN PROVIDED for Gateway WS");
			socket.close();
			return;
		}
		let player: PlayerPayload | null = null;

		try {
			player = server.jwt.verify<PlayerPayload>(token);
			console.log("Token verified", player);
		} catch (err) {
			socket.send(JSON.stringify({ error: "Unauthorized" }));
			server.log.error("COULDN'T PARSE TOKEN for Gateway WS");
			socket.close();
			return;
		}

		const userId = player!.sub;
		if (!userSockets.has(userId)) userSockets.set(userId, new Set());
		userSockets.get(userId)!.add(socket);

		server.log.info(`socket User connected: ${userId} (sockets: ${userSockets.get(userId)!.size})`);

		socket.on("message", async (msg: Buffer) => {
			try {
				const text = msg.toString('utf8');
				const data = JSON.parse(text);

				if (data.type === "join_match") {
					const matchName = data.name;
					if (playerInAnotherMatch(userId, matchName)) {
						server.log.warn(`User ${userId} has already joined another match`);
						return;
					}
					if (!matches.has(matchName)) {
						matches.set(matchName, {type: data.match_type, players: new Set(), started: false});
					}

					const match = matches.get(matchName)!;
					const isNewPlayer = !Array.from(match.players).some(p => p.sub === player.sub);
					
					if (isNewPlayer) {
						match.players.add(player);
					}

					server.log.info(`User ${userId} (${player.username}) joined match ${matchName}`);

					// First, send all existing players to the joining player
					const allPlayers = Array.from(match.players);
					for (const existingPlayer of allPlayers) {
						userSockets.get(player.sub)?.forEach((s) => {
							if (s.readyState === WebSocket.OPEN) {
								s.send(JSON.stringify({
									type: "player_joined",
									name: matchName,
									alias: existingPlayer.username,
									match_type: match.type
								}));
							}
						});
					}

					// Then, notify OTHER players (not the joiner) about the new player
					if (isNewPlayer) {
						for (const p of allPlayers) {
							if (p.sub !== player.sub) {
								userSockets.get(p.sub)?.forEach((s) => {
									if (s.readyState === WebSocket.OPEN) {
										s.send(JSON.stringify({
											type: "player_joined",
											name: matchName,
											alias: player.username,
											match_type: match.type
										}));
									}
								});
							}
						}
					}
			} else if (data.type === "start_match") {
				const playerData = matches.get(data.name)?.players;
					if (!playerData || playerData.size < 2) return;
					const match = matches.get(data.name);
					if (!match) return;
					match.started = true;
					const players: { id: number, alias: string }[] = [];
					for (const player of playerData) {
						if (player.sub !== undefined)
							players.push({ id: player.sub, alias: player.username! });

						const userSocket = userSockets.get(player.sub);
						if (userSocket) {
							userSocket.forEach(ws => {
								if (ws.readyState === WebSocket.OPEN) {
									server.log.info(`Sending start_game to player (userId: ${player.sub})`);
									ws.send(JSON.stringify({
										type: "start_match",
										matchName: data.name
									}));
								}
							});
						} else {
							server.log.warn(`Right player ${player.sub} has no active sockets`);
						}
					}
					await fetch(`${MATCH_SERVICE_URL}/match/new`, {
						method: "POST",
						headers: { "Content-Type": "application/json", "x-gateway-secret": `${GATEWAY_SECRET}`, },
						body: JSON.stringify({ name: data.name, players: players, type: "REMOTE", owner: null })
					});
				}
			} catch (err) {
				server.log.error({ err }, "Failed to parse socket message");
			}
		});

		socket.on("close", () => {
			const sockets = userSockets.get(userId);

			if (sockets) {
				sockets.delete(socket);
				if (sockets.size === 0) {
					userSockets.delete(userId);

					for (const [matchName, match] of matches) {
						let changed = false;

						for (const player of match.players) {
							if (player.sub === userId) {
								match.players.delete(player);
								changed = true;
								break;
							}
						}

						if (changed && match.players.size === 0 && match.type === "CONSOLE") {
							matches.delete(matchName);
							server.log.info(`Deleted empty CONSOLE match ${matchName}`);
						}
					}
				}
			}

			server.log.info(`User ${userId} disconnected`);
		});

	});

	server.log.info("WebSocket Gateway registered.");
}
