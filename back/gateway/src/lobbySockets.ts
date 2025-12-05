import { FastifyInstance } from "fastify";
import websocketPlugin from "@fastify/websocket";
import { WebSocket } from "ws";
import dotenv from "dotenv";

export interface PlayerPayload {
	sub: number;
	username: string;
}

interface Match {
	players: Set<PlayerPayload>,
	type: string
}

const matches = new Map<string, Match>();
// const matchPlayers = new Map<string, Set<number>>();
// const userInfo = new Map<number, string>();
const userSockets = new Map<number, Set<WebSocket>>();

// export function getOpenMatches() { return Array.from(matchPlayers.keys()) }
export function getOpenMatches() {
	const result: string[] = [];

	for (const [name, match] of matches.entries()) {
		if (match.type === "REMOTE") {
			result.push(name);
		}
	}
	console.log("Rmote matches: ", result);
	return result;
}

// export function getMatchPlayers(matchName: string) {
// 	const ids = matchPlayers.get(matchName);
// 	if (!ids) return [];
// 	return [...ids].map(id => (userInfo.get(id) ?? `User${id}`));
// }

export function getMatchPlayers(matchName: string) {
	const players = matches.get(matchName)?.players;
	if (!players) return [];
	const names: string[] = [];

	for (const player of players) {
		names.push(player.username);
	}
	return names;
}

// function playerInAnotherMatch(playerId: number, currentMatch: string): boolean {
// 	for (const [matchName, players] of matchPlayers) {
// 		if (matchName === currentMatch) continue;
// 		if (players.has(playerId)) return true;
// 	}
// 	return false;
// }
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
	console.log("game:", game);
	const players = matches.get(matchName)?.players;
	if (players) {
		for (const player of players)
		{
			const sockets = userSockets.get(player.sub);
			if (sockets) {
				sockets.forEach(ws => {
					if (ws.readyState === WebSocket.OPEN) {
						console.log(`Sending game_ready to console lobby socket player (userId: ${player.sub})`);
						ws.send(JSON.stringify({
							type: "game_ready",
							gameId: game.id,
							matchName: matchName,
							side: "both",
							rightp_player: game.right_player_alias,
							left_player: game.left_player_alias
						}));
					}
				});
			} else {
				console.warn(`Player ${player.sub} has no active sockets`);
			}
		}
	}
}

// export async function notifyAboutNewConsoleGame(game: any, matchName: string) {
// 	console.log("game:", game);
// 	const players = matchPlayers.get(matchName);
// 	if (players) {
// 		players.forEach(id => {
// 			const sockets = userSockets.get(id);
// 			if (sockets) {
// 				sockets.forEach(ws => {
// 					if (ws.readyState === WebSocket.OPEN) {
// 						console.log(`Sending game_ready to console lobby socket player (userId: ${id})`);
// 						ws.send(JSON.stringify({
// 							type: "game_ready",
// 							gameId: game.id,
// 							matchName: matchName,
// 							side: "both",
// 							rightp_player: game.right_player_alias,
// 							left_player: game.left_player_alias
// 						}));
// 					}
// 				});
// 			} else {
// 				console.warn(`Player ${id} has no active sockets`);
// 			}

// 		})
// 	}
// }

export async function notifyAboutNewGame(games: any[], matchName: string) {
	for (const game of games) {
		console.log("game:", game);
		const leftUserId = game.left_player_id;
		const rightUserId = game.right_player_id;

		const leftSockets = userSockets.get(leftUserId);
		if (leftSockets) {
			leftSockets.forEach(ws => {
				if (ws.readyState === WebSocket.OPEN) {
					console.log(`Sending game_ready to left player (userId: ${leftUserId})`);
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
			console.warn(`Left player ${leftUserId} has no active sockets`);
		}

		// Send to right player
		const rightSockets = userSockets.get(rightUserId);
		if (rightSockets) {
			rightSockets.forEach(ws => {
				if (ws.readyState === WebSocket.OPEN) {
					console.log(`Sending game_ready to right player (userId: ${rightUserId})`);
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
			console.warn(`Right player ${rightUserId} has no active sockets`);
		}
	}
}

// export async function notifyEndMatch(matchName: string, matchId: number, winnerAlias: string, winnerId: number) {
// 	const players = matchPlayers.get(matchName);
// 	if (!players || players.size === 0) return new Error("no sockets for this match");
// 	for (const player of players) {
// 		const sockets = userSockets.get(player);
// 		if (sockets) {
// 			sockets.forEach(ws => {
// 				if (ws.readyState === WebSocket.OPEN) {
// 					console.log(`Sending end of match to player (userId: ${player})`);
// 					ws.send(JSON.stringify({
// 						type: "end_match",
// 						matchName: matchName,
// 						winner: winnerAlias
// 					}));
// 				}
// 			});
// 		} else {
// 			console.warn(`Player ${player} has no active sockets`);
// 		}
// 	}
// 	matchPlayers.delete(matchName);
// }

export async function notifyEndMatch(matchName: string, matchId: number, winnerAlias: string, winnerId: number){
	const players = matches.get(matchName)?.players;
	if (!players || players.size === 0) return new Error("no sockets for this match");
	for (const player of players) {
		const sockets = userSockets.get(player.sub);
		if (sockets) {
			sockets.forEach(ws => {
				if (ws.readyState === WebSocket.OPEN) {
					console.log(`Sending end of match to player (userId: ${player.sub})`);
					ws.send(JSON.stringify({
						type: "end_match",
						matchName: matchName,
						winner: winnerAlias
					}));
				}
			});
		} else {
			console.warn(`Player ${player.sub} has no active sockets`);
		}
	}
	matches.delete(matchName);
}

export async function registerGatewayWebSocket(server: FastifyInstance) {
	await server.register(websocketPlugin);
	console.log("websocket registered on gateway");

	server.get("/ws", { websocket: true }, (socket, req) => {

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
		// userInfo.set(player!.sub, player!.username);

		console.log(`socket User connected: ${userId} (sockets: ${userSockets.get(userId)!.size})`);

		socket.on("message", async (msg: Buffer) => {
			try {
				const text = msg.toString('utf8');
				const data = JSON.parse(text);

				if (data.type === "join_match") {
					const matchName = data.name;
					if (playerInAnotherMatch(userId, matchName)) {
						console.log(`User ${userId} has already joined another match`);
						return;
					}
					// if (!matchPlayers.has(matchName)) matchPlayers.set(matchName, new Set());
					// matchPlayers.get(matchName)!.add(userId);
					if (!matches.has(matchName)) matches.set(matchName,{type: data.match_type, players: new Set()} );
					matches.get(matchName)!.players.add(player);

					console.log(`User ${userId} joined match ${matchName}`);

					const players = matches.get(matchName)!.players;
					for (const player of players) {
						userSockets.get(player.sub)?.forEach((s) => {
							if (s.readyState === WebSocket.OPEN) {
								s.send(JSON.stringify({
									type: "player_joined",
									name: matchName,
									alias: player!.username,
									match_type: matches.get(matchName)!.type
								}));
							}
						});
					};
				}

				if (data.type === "new_match") {
					if (!matches.has(data.name)) matches.set(data.name, {type: data.match_type, players:new Set()});
					else {
						socket.send(JSON.stringify({ error: "Match already exists" }));
						console.log("MATCH ALREADY EXISTS");
					}
				}

				if (data.type === "start_match") {
					console.log("Received start_match");
					const playerData = matches.get(data.name)?.players;
					if (!playerData || playerData.size < 2) return;
					const players: { id: number, alias: string }[] = [];
					for (const player of playerData) {
						if (player.sub !== undefined)
							players.push({ id: player.sub, alias: player.username! });

						const userSocket = userSockets.get(player.sub);
						if (userSocket) {
							userSocket.forEach(ws => {
								if (ws.readyState === WebSocket.OPEN) {
									console.log(`Sending start_game to player (userId: ${player.sub})`);
									ws.send(JSON.stringify({
										type: "start_match",
										matchName: data.name
									}));
								}
							});
						} else {
							console.warn(`Right player ${player.sub} has no active sockets`);
						}
					}
					const MATCH_SERVICE_DIRECT = process.env.MATCH_SERVICE_URL ?? "http://match:3004";
					await fetch(`${MATCH_SERVICE_DIRECT}/match/new`, {
						method: "POST",
						headers: { "Content-Type": "application/json", "x-gateway-secret": `${process.env.GATEWAY_SECRET}`, },
						body: JSON.stringify({ name: data.name, players: players, type: "REMOTE", owner: null })
					});
				}
			} catch (err) {
				console.error("Failed to parse socket message", err);
			}
		});

		socket.on("close", () => {
			const sockets = userSockets.get(userId);
		
			// 1. Remove this socket
			if (sockets) {
				sockets.delete(socket);
				if (sockets.size === 0) {
					userSockets.delete(userId);
		
					// 2. Remove player from all matches
					for (const [matchName, match] of matches) {
						let changed = false;
		
						// Remove the player from the match
						for (const player of match.players) {
							if (player.sub === userId) {
								match.players.delete(player);
								changed = true;
								break;
							}
						}
		
						// 3. If match is empty AND is CONSOLE type → delete it
						if (changed && match.players.size === 0 && match.type === "CONSOLE") {
							matches.delete(matchName);
							console.log(`Deleted empty CONSOLE match ${matchName}`);
						}
					}
				}
			}
		
			console.log(`User ${userId} disconnected`);
		});
		
	});

	console.log("WebSocket Gateway registered.");
}
