import { RawData } from "ws";
import { serveBall, resetSpecs, updatePos } from "./gamePlay.js";
import { board, GameObject, GameState, PlayerSocket } from "./gameSpecs.js";
import Fastify from "fastify";
import { FastifyRequest, FastifyReply } from "fastify";
import dotenv from "dotenv";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";

export const playerKeys = {
	left: { up:false, down:false },
	right: { up: false, down: false },
};

dotenv.config(); //loads the credentials from the .env file insto process.env
const PORT = Number(process.env.PORT || 3003);
//const GENGINE_URL = process.env.GENGINE_URL;

const server = Fastify({ logger: true });
await server.register(cors, { origin: true });
await server.register(websocketPlugin);

export const gameStates = new Map<number, GameState>();
const games = new Map<number, GameObject>();
const gameSockets = new Map<number, Set<PlayerSocket>>();
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

server.get("/ws", {websocket: true }, (ws, req) => {
	const { gameId, side, player } = req.query as {gameId: string, side: 'left' | 'right', player: string };

	
	console.log("inside game socket");
	if (!gameId || !player || !side) {
		ws.close();
		return;
	}
	const gameIdN = Number(gameId);
	if (isNaN(gameIdN)) {
		ws.close();
		console.log("game Id is not a number");
		return;
	}

	const playerSocket: PlayerSocket = { ws, alias: player, side: side };

	if (!gameSockets.has(gameIdN)) {
		gameSockets.set(gameIdN, new Set());
	}
	gameSockets.get(gameIdN)!.add(playerSocket);

	console.log(`Client connected for match ${gameIdN}, player ${player}, playing on ${side} side`);

	// console.log("sending set message to front end");
	// ws.send(JSON.stringify({ type: "consts", data: board}));
	// ws.send(JSON.stringify({type: "set", data: gameStates.get(gameId)}));
	ws.on('message', (data) => {
		try {
			const message = JSON.parse(data.toString());
			handleMessage(gameIdN, playerSocket, message);
		} catch (err) {
			console.error("Failed to parse incoming message:", err);
		}
	});
	ws.on("close", () => {
		gameSockets.get(gameIdN)?.delete(playerSocket);
		console.log(`Client disconnected from game with id ${gameId}`);
		
		// if no players are connected anymore, stop the loop
		if (gameSockets.get(gameIdN)?.size === 0) {
			clearInterval(gameIntervals.get(gameIdN));
			gameIntervals.delete(gameIdN);
			console.log(`Stopped loop for game with id ${gameId}`);
		}
	});
})

//let interval: NodeJS.Timeout | null = null;

server.post("/game/start", async(request: FastifyRequest, reply: FastifyReply) => {
	console.log("received post request with body: ", request.body);
	const newGame = request.body as GameObject;

	if(!newGame.leftPlayer || !newGame.rightPlayer || !newGame.gameId || !newGame.type) {
		return reply.status(400).send({error: "Missing player info or match id" });
	}
	games.set(newGame.gameId, newGame);
	gameStates.set(newGame.gameId, new GameState(newGame));

	const ws = [...clients][0];
	if (!ws || ws.readyState !== ws.OPEN) {
		console.warn("No connected WebSocket clients to send start message");
		return reply.status(503).send({ error: "No active WebSocket client connected" });
	}
	ws.send(JSON.stringify({ type: "start" }));
	console.log("start message sent to client");
	console.log("Received /game/start, notifying client via WS");
	return reply.send({ok: true, message: "game started, client notified"});
});

server.post("/game/move", async(request: FastifyRequest, reply: FastifyReply) => {
	console.log("received post request with body: ", request.body);
	const { whichPlayer, dir }: {whichPlayer: 'left' | 'right'; dir: 'up' | 'down' | 'stop'} = request.body as any;

	if (whichPlayer != 'left' && whichPlayer != 'right')
		return reply.status(400).send({error: "Missing or invalid player - has to be 'left' or 'right'" });
	if (dir != 'up' && dir != 'down' && dir != 'stop')
		return reply.status(400).send({error: "Missing or invalid move - has to be 'up' or 'down'" });
	if (whichPlayer === 'left') {
		dir === 'up' ? 
		(playerKeys.left.up = true,  playerKeys.left.down = false) : 
		dir === 'down' ? 
			(playerKeys.left.down = true, playerKeys.left.up = false) 
		: (playerKeys.left.down = false, playerKeys.left.up = false);
	} else {
		dir === 'up' ? 
		(playerKeys.right.up = true,  playerKeys.right.down = false) : 
		dir === 'down' ? 
			(playerKeys.right.down = true, playerKeys.right.up = false) 
		: (playerKeys.right.down = false, playerKeys.right.up = false);
	}
});


server.get("/game/stop", async(request: FastifyRequest, reply: FastifyReply) => {
	console.log("received stop request");
	const ws = [...clients][0];
	ws.send(JSON.stringify({ type: "stop" }));
	console.log("Stop message sent to client");

	return reply.send({ ok: true, message: "stop message sent" });
});


await server.listen({ port: PORT, host: "0.0.0.0" });
console.log(`Game Engine API and WS running on http://localhost:${PORT}`);

function handleMessage(gameId: number, player:PlayerSocket, message: any) {
	console.log('Parsed message: ', message);
	let gameState = gameStates.get(gameId) as GameState;
		if (message.type === "set") {
			console.log('Client is ready, starting game');
			player.ws.send(JSON.stringify({type: "set", data: gameState}));
		}
		if (message.type === "consts")
			player.ws.send(JSON.stringify({ type: "consts", data: board}));
		if (message.type === "please serve") {
			deleteInterval(gameId);
			console.log("serving ball");
			serveBall(gameState);
			// player.ws.send(JSON.stringify({ type: "go"}));
			broadcast(gameId, { type: "go" });
			const interval = setInterval(() => {
				if (updatePos(gameState) === 1) {
					deleteInterval(gameId);
					// ws.send(JSON.stringify({ type: "win", data: gameState }));

					(async () => {
					try {
						const nextGame = await getNextGame(gameState);
						player.ws.send(JSON.stringify({ type: "win", data: gameState,  next: nextGame.gameId}));
						resetSpecs(gameState, nextGame);
					} catch (err) {
						player.ws.send(JSON.stringify({ type: "win", data: gameState,  next: -1}));
						resetSpecs(gameState, -1);
					}
					})();
				}
				// ws.send(JSON.stringify({ type: "state", data: gameState}));
				broadcast(gameId, { type: "state", data: gameState});
			}, 1000/ 60);
			gameIntervals.set(gameId, interval);
		}
		if (message.type === "input") {
			handleInput(gameId, player, message.data.code, message.data.pressed);
		}
}

async function getNextGame(gameState: GameState): Promise<GameObject> {
	const response = await fetch("http://gateway:3000/match/console/result", {
		method: "POST",
		headers: {"Content-Type": "application/json" },
		body: JSON.stringify({ gameId: gameState.current.gameId, winner: gameState.winner, loser: gameState.loser}),
	});
	if (!response.ok) throw new Error("failed to fetch new game");
	const obj: GameObject = await response.json();
	return obj;
}

function handleInput(gameId: number, player: PlayerSocket, code: string, pressed: boolean) {
	let gameState = gameStates.get(gameId) as GameState;
	if (player.id === gameState.current.leftPlayer.id) {
		if (code === 'ArrowUp')
			playerKeys.right.up = pressed;
		if (code === 'ArrowDown')
			playerKeys.right.down = pressed;
	}
	if (player.id === gameState.current.rightPlayer.id) {
		if (code === 'KeyW')
			playerKeys.left.up = pressed;
		if (code === 'KeyS')
			playerKeys.left.down = pressed;
	}
	if (code === 'Escape') {
		deleteInterval(gameId);
		resetSpecs(gameState, -1);
	}
}
