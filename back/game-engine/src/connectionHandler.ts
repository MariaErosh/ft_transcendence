import WebSocket, { RawData } from "ws";
import { IncomingMessage } from "http";
import { Duplex } from "stream";
import { serveBall, resetSpecs, updatePos } from "./gamePlay.js";
import { board, gameState, Player } from "./gameSpecs.js";
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

	console.log("sending const and set message to front end");
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
	const { leftPlayer, rightPlayer, matchId, type } = request.body as {
		leftPlayer: { alias: string, id: number };
		rightPlayer: { alias: string, id: number };
		matchId: number;
		type: string;
	};

	if(!leftPlayer || !rightPlayer || !matchId || !type) {
		return reply.status(400).send({error: "Missing player info or match id" });
	}
	gameState.leftPlayer = leftPlayer;
	gameState.rightPlayer = rightPlayer;
	gameState.matchID = matchId;
	console.log("Received /game/start, notifying client via WS");
	return reply.send({ok: true, message: "game started, client notified"});	
});

await server.listen({ port: PORT, host: "0.0.0.0" });
console.log(`Game Engine API and WS running on http://localhost:${PORT}`);



function handleMessage(ws: WebSocket, message: any) {
	console.log('Parsed message: ', message);
		// if (message.type === "ready") {
		// 	console.log('Client is ready, starting game');
		// 	ws.send(JSON.stringify({type: "set", data: gameState}));
		// }
		if (message.type === "please serve") {
			console.log("serving ball");
			serveBall();
			for (const client of clients) {
				client.send(JSON.stringify({ type: "go"}));
			}
			interval = setInterval(() => {
				if (updatePos() === 1) {
					if (interval) clearInterval(interval);
					for (const client of clients) {
						client.send(JSON.stringify({ type: "win", data: gameState }))
					}
					resetSpecs();
				}
				for (const client of clients) {
					client.send(JSON.stringify({ type: "state", data: gameState }));
				}
			}, 1000/ 60);
		}
		if (message.type === "input") {
			handleInput(message.data.code, message.data.pressed);
		}
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
		resetSpecs();
	}
}

