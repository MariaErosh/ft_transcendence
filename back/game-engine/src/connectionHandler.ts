import WebSocket, { RawData } from "ws";
import { serveBall, resetSpecs, updatePos } from "./gamePlay.js";
import { board, gameState, GameObject } from "./gameSpecs.js";
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

const clients = new Set<WebSocket>();

server.get("/ws", {websocket: true }, (ws: WebSocket, req: FastifyRequest) => {
	//const ws: WebSocket = connection.socket;
	clients.add(ws);
	console.log('Client connected via websocket');

	console.log("sending set message to front end");
	ws.send(JSON.stringify({ type: "consts", data: board}));
	ws.send(JSON.stringify({type: "set", data: gameState}));
	ws.on('message', (data: RawData) => {
		try {
			const message = JSON.parse(data.toString());
			handleMessage(ws, message);
		} catch (err) {
			console.error("Failed to parse incoming message:", err);
		}
	});
	ws.on("close", () => {
		clients.delete(ws);
		console.log("Client disconnected");
		if (interval) clearInterval(interval);
	});
})

//const wss = new WebSocketServer({ port: 3003});
// const wss = new WebSocketServer({ noServer: true });
// console.log('Websocket for game engine is up');

let interval: NodeJS.Timeout | null = null;

server.post("/game/start", async(request: FastifyRequest, reply: FastifyReply) => {
	console.log("received post request with body: ", request.body);
	const { leftPlayer, rightPlayer, matchId, type } = request.body as GameObject;

	if(!leftPlayer || !rightPlayer || !matchId || !type) {
		return reply.status(400).send({error: "Missing player info or match id" });
	}
	gameState.current.leftPlayer = leftPlayer;
	gameState.current.rightPlayer = rightPlayer;
	gameState.current.matchId = matchId;
	gameState.current.type = type;
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

server.get("/game/stop", async(request: FastifyRequest, reply: FastifyReply) => {
	console.log("received stop request");
	const ws = [...clients][0];
	ws.send(JSON.stringify({ type: "stop" }));
	console.log("Stop message sent to client");

	return reply.send({ ok: true, message: "stop message sent" });
});

await server.listen({ port: PORT, host: "0.0.0.0" });
console.log(`Game Engine API and WS running on http://localhost:${PORT}`);


function handleMessage(ws: WebSocket, message: any) {
	console.log('Parsed message: ', message);
		if (message.type === "set") {
			console.log('Client is ready, starting game');
			ws.send(JSON.stringify({type: "set", data: gameState}));
		}
		if (message.type === "consts")
			ws.send(JSON.stringify({ type: "consts", data: board}));
		if (message.type === "please serve") {
			console.log("serving ball");
			serveBall();
			ws.send(JSON.stringify({ type: "go"}));
			interval = setInterval(() => {
				if (updatePos() === 1) {
					if (interval) clearInterval(interval);
					ws.send(JSON.stringify({ type: "win", data: gameState }));

					(async () => {
					try {
						const nextGame = await getNextGame();
						resetSpecs(nextGame);
					} catch (err) {
						resetSpecs(-1);
					}
					})();
				}
				ws.send(JSON.stringify({ type: "state", data: gameState }));
			}, 1000/ 60);
		}
		if (message.type === "input") {
			handleInput(message.data.code, message.data.pressed);
		}
}

async function getNextGame(): Promise<GameObject> {
	const response = await fetch("http://gateway:3000/match/result", {
		method: "POST",
		headers: {"Content-Type": "application/json" },
		body: JSON.stringify({ matchId: gameState.current.matchId, winner: gameState.winner, loser: gameState.loser}),
	});
	if (!response.ok) throw new Error("failed to fetch new game");
	const obj: GameObject = await response.json();
	return obj;
}

// wss.on('connection', (ws) => {
// 	console.log('Client connected');
// 	connectedClient = ws;

// 	ws.send(JSON.stringify({ type: "consts", data: board}));
// 	ws.on('message', (data) => {
// 		const message = JSON.parse(data.toString());
// 		console.log('Parsed message: ', message);
// 		// if (message.type === "ready") {
// 		// 	console.log('Client is ready, starting game');
// 		// 	ws.send(JSON.stringify({type: "set", data: gameState}));
// 		// }
// 		if (message.type === "please serve") {
// 			console.log("serving ball");
// 			serveBall();
// 			ws.send(JSON.stringify({ type: "go"}));
// 			interval = setInterval(() => {
// 				if (updatePos() === 1) {
// 					if (interval) clearInterval(interval);
// 					ws.send(JSON.stringify({ type: "win", data: gameState }))
// 					resetSpecs();
// 				}
// 				ws.send(JSON.stringify({ type: "state", data: gameState }));
// 			}, 1000/ 60);
// 		}
// 		if (message.type === "input") {
// 			handleInput(message.data.code, message.data.pressed);
// 		}
// 	});
// 	ws.on("close", () => {
// 		console.log("Client disconnected");
// 		if (interval) clearInterval(interval);
// 	});
// });

function handleInput(code: string, pressed: boolean) {
	if (code === 'ArrowUp')
		playerKeys.right.up = pressed;
	if (code === 'ArrowDown')
		playerKeys.right.down = pressed;
	if (code === 'KeyW')
		playerKeys.left.up = pressed;
	if (code === 'KeyS')
		playerKeys.left.down = pressed;
	if (code === 'Escape') {
		if (interval) clearInterval(interval);
		resetSpecs(-1);
	}
}

