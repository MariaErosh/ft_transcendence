import { RawData } from "ws";
import { serveBall, updatePos } from "./gamePlay.js";
import { board, GameObject, GameState, PlayerSocket, GameMeta } from "./gameSpecs.js";
import Fastify from "fastify";
import { FastifyRequest, FastifyReply } from "fastify";
import dotenv from "dotenv";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";

export const playerKeys = new Map<number, {
	left: { up: boolean, down: boolean },
	right: { up: boolean, down: boolean } 
}>();

const gameMeta = new Map<number, GameMeta>();

dotenv.config(); //loads the credentials from the .env file insto process.env
const PORT = Number(process.env.PORT || 3003);
const GATEWAY = process.env.GATEWAY_URL;
//const GENGINE_URL = process.env.GENGINE_URL;

export const server = Fastify({ logger: true });
await server.register(cors, { origin: true });
await server.register(websocketPlugin);

export const gameStates = new Map<number, GameState>();
export const games = new Map<number, GameObject>();
const gameSockets = new Map<number, Set<PlayerSocket>>();
const playerSockets = new Map<string, Set<PlayerSocket>>();
const gameIntervals = new Map<number, NodeJS.Timeout>();

function deleteInterval(gameId: number) {
	if (gameIntervals.get(gameId)) {
		clearInterval(gameIntervals.get(gameId));
		gameIntervals.delete(gameId);
	}
}

function broadcast(gameId: number, payload: object) {
	const set = gameSockets.get(gameId);
	if (!set) return;
	const message = JSON.stringify(payload);
	for (const player of set)
		player.ws.send(message);
}

server.get("/ws", { websocket: true }, async (ws, req) => {
	const { player } = req.query as { player: string };
	console.log("inside game socket");
	if (!player) {
		ws.close();
		return;
	}
	const playerSocket: PlayerSocket = { ws, alias: player, ready: false};
	if (!playerSockets.has(player))
		playerSockets.set(player, new Set());
	playerSockets.get(player)!.add(playerSocket);

	ws.on('message', (data) => {
		try {
			const message = JSON.parse(data.toString());
			handleMessage(playerSocket, message);
		} catch (err) {
			console.error("Failed to parse incoming message:", err);
		}
	});
	ws.on("close", () => {
		const gameId = playerSocket.gameId;
		if (!gameId) {
			playerSockets.get(player)?.delete(playerSocket);
			return console.log(`Player ${player} disconnected`);
		}
		gameSockets.get(gameId)?.delete(playerSocket);
		// if no players are connected anymore, stop the loop
		if (gameSockets.get(gameId)?.size === 0) {
			deleteInterval(gameId);
			console.log(`Stopped loop for game with id ${gameId}`);
			games.delete(gameId);
			gameSockets.delete(gameId);
			gameStates.delete(gameId);
			gameMeta.delete(gameId);
		}
	});
})

//let interval: NodeJS.Timeout | null = null;




await server.listen({ port: PORT, host: "0.0.0.0" });
console.log(`Game Engine API and WS running on http://localhost:${PORT}`);

async function handleMessage(player: PlayerSocket, message: any) {
	console.log('Parsed message: ', message, 'received from player ', player.alias);
	//let gameState = gameStates.get(gameId) as GameState;

	if (message.type === "consts")
		player.ws.send(JSON.stringify({ type: "consts", data: board }));

	if (message.type === "PLAYER_READY") {
		player.ready = true;
		canStartGame(player.gameId);
	}
	
	if (message.type === "new_game") {
		const newGameId = Number(message.gameId);
		const oldGameId = player.gameId;

		if (oldGameId && gameSockets.has(oldGameId))
			gameSockets.get(oldGameId)!.delete(player);
		player.gameId = newGameId;
		player.ready = false;

		if (!gameSockets.has(newGameId))
			gameSockets.set(newGameId, new Set());
		gameSockets.get(newGameId)!.add(player);

	console.log(`Client connected for game ${newGameId}, player ${player.alias}`);
	if (!gameStates.get(newGameId)) {
		let next = await loadGameData(newGameId); 
		gameStates.set(newGameId, new GameState(next));

		gameMeta.set(newGameId, {
			newGameLoaded: true,
			playersReady: new Set(),
			started:false,
		});
	}
	//const gameState = gameStates.get(newGameId);
	//console.log("game State: ", gameState);
	playerKeys.set(newGameId, { left: { up: false, down: false }, right: { up: false, down: false}});

	//player.ws.send(JSON.stringify({ type: "ready", data: { board, gameState }}));
	return;
}

	if (!player.gameId) {
		console.warn("Received later message before new_game message");
		return;
	}
	const gameId = player.gameId;
	let gameState = gameStates.get(gameId)!;
	// if (message.type === "set") {
	// 	console.log('Client is ready, starting game');
	// 	player.ws.send(JSON.stringify({ type: "set", data: gameState }));
	// }
	
	if (message.type === "please serve") {
		deleteInterval(gameId);
		console.log("serving ball");
		serveBall(gameState);
		// player.ws.send(JSON.stringify({ type: "go"}));
		broadcast(gameId, { type: "go" });
		const interval = setInterval(() => {
			if (updatePos(gameState) === 1) {

				const sockets = gameSockets.get(gameId);
				if (!sockets) {
					console.error("No matching game socket found for game ID", gameId);
					return;
				}
				sendResult(gameState);
				for (const p of sockets) {
					p.ws.send(JSON.stringify({ type: "win", data: gameState }));
				}
				deleteInterval(gameId);
				gameStates.delete(gameId);
				games.delete(gameId);
				gameSockets.delete(gameId);
				gameMeta.delete(gameId);
			}
			broadcast(gameId, { type: "state", data: gameState });
			}, 1000 / 60);
		gameIntervals.set(gameId, interval);
	}

	if (message.type === "input") {
		handleInput(gameId, player, message.data.code, message.data.pressed);
	}
}

function canStartGame(gameId?: number) {
	if (!gameId) return;

	const meta = gameMeta.get(gameId);
	const sockets = gameSockets.get(gameId);
	const gameState = gameStates.get(gameId);

	if (!meta || !sockets || !gameState) return;
	if (meta.started) return;

	meta.playersReady.clear();

	for (const p of sockets) {
		if (p.ready) meta.playersReady.add(p.alias);
	}
	if (gameState.current.type === "REMOTE" && meta.playersReady.size < 2) {
		console.log(`Game ${gameId}: waiting for players`);
		return;
	}

	meta.started = true;
	console.log(`Game ${gameId}: starting`);

	broadcast(gameId, {type: "ready", data: { board, gameState }});
}

async function loadGameData(gameId: number) {
	let game = games.get(gameId);
	if (game) return game;
	console.log("backend requesting game via GET");

	let data = await fetch(`${GATEWAY}/match/game?gameId=${gameId}`, {
	method: "GET",
	headers: { "Content-Type": "application/json" },
	});
	let gameData = await data.json();
	console.log("gameData fetched:", gameData);
	
	if (!gameData.type || !gameData.leftPlayer?.alias || !gameData.rightPlayer?.alias || !gameData.gameId  || (gameData.type == 'REMOTE' && !gameData.leftPlayer?.id) || (gameData.type == 'REMOTE' && !gameData.rightPlayer?.id))
		throw new Error("Incomplete game data");
	game = {
		leftPlayer: { alias: gameData.leftPlayer.alias, id: gameData.leftPlayer.id },
		rightPlayer: { alias: gameData.rightPlayer.alias, id: gameData.rightPlayer.id },
		gameId: gameData.gameId,
		type: gameData.type
	} as GameObject;
	games.set(gameId, game);
	return game;
}

async function sendResult(gameState: GameState) {
	const response = await fetch(`${GATEWAY}/match/result`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ gameId: gameState.current.gameId, winner: gameState.winner, loser: gameState.loser }),
	});
	console.log("sending result for game id ", gameState.current.gameId, "winner: ", gameState.winner, ", loser: ", gameState.loser);
	if (!response.ok)
		console.error("failed to record results");
}

function handleInput(gameId: number, player: PlayerSocket, code: string, pressed: boolean) {
	let gameState = gameStates.get(gameId) as GameState;
	const keys = playerKeys.get(gameId);
	if (!keys) return;
	if (gameState.current.type == 'CONSOLE') {
		if (player.gameId === gameId) {
			if (code === 'ArrowUp')
				keys.right.up = pressed;
			if (code === 'ArrowDown')
				keys.right.down = pressed;
			if (code === 'KeyW')
				keys.left.up = pressed;
			if (code === 'KeyS')
				keys.left.down = pressed;
		}
	}
	else {
		if (player.alias === gameState.current.rightPlayer.alias) {
			if (code === 'ArrowUp')
				keys.right.up = pressed;
			if (code === 'ArrowDown')
				keys.right.down = pressed;
		}
		if (player.alias === gameState.current.leftPlayer.alias) {
			if (code === 'KeyW' || code === 'ArrowUp')
				keys.left.up = pressed;
			if (code === 'KeyS' || code === 'ArrowDown')
				keys.left.down = pressed;
		}
	}
		if (code === 'Escape') {
			deleteInterval(gameId);
			//resetSpecs(gameState, -1);
			const sockets = gameSockets.get(gameId);
			if (!sockets) {
				console.error("No matching game socket found for game ID", gameId);
				return;
			}
			for (const p of sockets) {
				p.ws.send(JSON.stringify({ type: "stop" }));
			}

		}
}



// async function getNextGame(gameState: GameState): Promise<GameObject> {
// 	const response = await fetch("http://gateway:3000/match/console/result", {
// 		method: "POST",
// 		headers: { "Content-Type": "application/json" },
// 		body: JSON.stringify({ gameId: gameState.current.gameId, winner: gameState.winner, loser: gameState.loser }),
// 	});
// 	if (!response.ok) throw new Error("failed to fetch new game");
// 	const obj: GameObject = await response.json();
// 	return obj;
// }
