import WebSocket, { RawData } from "ws";
import { serveBall, resetSpecs, updatePos } from "./gamePlay.js";
import { board, gameState, GameObject } from "./gameSpecs.js";
import Fastify from "fastify";
import { FastifyRequest, FastifyReply } from "fastify";
import dotenv from "dotenv";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import logger from "../../../../observability/dist/log/logger"; // Import logger
import { register, matchDuration, matchResults, activeMatches } from "../../../../observability/dist/metrics/metrics"; // Import metrics

export const playerKeys = {
    left: { up:false, down:false },
    right: { up: false, down: false },
};

dotenv.config(); // Loads the credentials from the .env file into process.env
const PORT = Number(process.env.PORT || 3003);
//const GENGINE_URL = process.env.GENGINE_URL;

const server = Fastify({ logger: true });
await server.register(cors, { origin: true });
await server.register(websocketPlugin);

const clients = new Set<WebSocket>();

// WebSocket endpoint for game clients
server.get("/ws", {websocket: true }, (ws: WebSocket, req: FastifyRequest) => {
    clients.add(ws);
    logger.info("Client connected via WebSocket", { clientCount: clients.size });
    console.log('Client connected via websocket');

    console.log("sending set message to front end");
    ws.send(JSON.stringify({ type: "consts", data: board}));
    ws.send(JSON.stringify({type: "set", data: gameState}));

    ws.on('message', (data: RawData) => {
        try {
            const message = JSON.parse(data.toString());
            handleMessage(ws, message);
        } catch (err) {
            logger.error("Failed to parse incoming message:", { error: err });
            console.error("Failed to parse incoming message:", err);
        }
    });

    ws.on("close", () => {
        clients.delete(ws);
        logger.info("Client disconnected", { clientCount: clients.size });
        console.log("Client disconnected");
        if (interval) clearInterval(interval);
    });
})

// Health check endpoint
server.get("/health", async () => {
    logger.info("Health check");
    return { status: "ok" };
});

// Metrics endpoint for Prometheus
server.get("/metrics", async (request, reply) => {
    logger.info("Metrics endpoint accessed");
    reply.type(register.contentType);
    return await register.metrics();
});

let interval: NodeJS.Timeout | null = null;

// Start game endpoint
server.post("/game/start", async(request: FastifyRequest, reply: FastifyReply) => {
    logger.info("Received /game/start request", { body: request.body });
    console.log("received post request with body: ", request.body);
    const newGame = request.body as GameObject;

    if(!newGame.leftPlayer || !newGame.rightPlayer || !newGame.matchId || !newGame.type) {
        logger.warn("Invalid game start request - missing player info or match id", { matchId: newGame.matchId });
        return reply.status(400).send({error: "Missing player info or match id" });
    }

    resetSpecs(newGame);
    logger.info("Game specs reset", { matchId: newGame.matchId, type: newGame.type, leftPlayer: newGame.leftPlayer, rightPlayer: newGame.rightPlayer });

    const ws = [...clients][0];
    if (!ws || ws.readyState !== ws.OPEN) {
        logger.warn("No connected WebSocket clients to send start message");
        console.warn("No connected WebSocket clients to send start message");
        return reply.status(503).send({ error: "No active WebSocket client connected" });
    }

    ws.send(JSON.stringify({ type: "start" }));
    logger.info("Start message sent to client", { matchId: newGame.matchId });
    console.log("start message sent to client");
    console.log("Received /game/start, notifying client via WS");
    return reply.send({ok: true, message: "game started, client notified"});
});

// Player move endpoint
server.post("/game/move", async(request: FastifyRequest, reply: FastifyReply) => {
    const { whichPlayer, dir }: {whichPlayer: 'left' | 'right'; dir: 'up' | 'down' | 'stop'} = request.body as any;
    logger.info("Received /game/move request", { player: whichPlayer, direction: dir });
    console.log("received post request with body: ", request.body);

    if (whichPlayer != 'left' && whichPlayer != 'right') {
        logger.warn("Invalid player in move request", { whichPlayer });
        return reply.status(400).send({error: "Missing or invalid player - has to be 'left' or 'right'" });
    }

    if (dir != 'up' && dir != 'down' && dir != 'stop') {
        logger.warn("Invalid direction in move request", { dir });
        return reply.status(400).send({error: "Missing or invalid move - has to be 'up' or 'down'" });
    }

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

    logger.info("Player move processed", { player: whichPlayer, direction: dir });
    return reply.send({ok: true});
});

// Stop game endpoint
server.get("/game/stop", async(request: FastifyRequest, reply: FastifyReply) => {
    logger.info("Received /game/stop request");
    console.log("received stop request");
    const ws = [...clients][0];
    ws.send(JSON.stringify({ type: "stop" }));
    logger.info("Stop message sent to client");
    console.log("Stop message sent to client");

    return reply.send({ ok: true, message: "stop message sent" });
});

await server.listen({ port: PORT, host: "0.0.0.0" });
logger.info("Game engine started successfully", { port: PORT });
console.log(`Game Engine API and WS running on http://localhost:${PORT}`);

function handleMessage(ws: WebSocket, message: any) {
    logger.info('Received message from client', { type: message.type });
    console.log('Parsed message: ', message);

    if (message.type === "set") {
        logger.info('Client is ready, starting game');
        console.log('Client is ready, starting game');
        ws.send(JSON.stringify({type: "set", data: gameState}));
    }

    if (message.type === "consts") {
        ws.send(JSON.stringify({ type: "consts", data: board}));
    }

    if (message.type === "please serve") {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
        logger.info("Ball served", { matchId: gameState.current.matchId });
        console.log("serving ball");
        serveBall();
        ws.send(JSON.stringify({ type: "go"}));

        interval = setInterval(() => {
            if (updatePos() === 1) {
                if (interval) clearInterval(interval);

                logger.info("Match ended", { matchId: gameState.current.matchId, winner: gameState.winner, loser: gameState.loser });

                (async () => {
                try {
                    const nextGame = await getNextGame();
                    ws.send(JSON.stringify({ type: "win", data: gameState,  next: nextGame.matchId}));
                    resetSpecs(nextGame);
                    logger.info("Next game loaded", { nextMatchId: nextGame.matchId });
                } catch (err) {
                    ws.send(JSON.stringify({ type: "win", data: gameState,  next: -1}));
                    resetSpecs(-1);
                    logger.error("Failed to load next game", { error: err });
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
    logger.info("Fetching next game from gateway", { matchId: gameState.current.matchId });

    const response = await fetch("http://gateway:3000/match/result", {
        method: "POST",
        headers: {"Content-Type": "application/json" },
        body: JSON.stringify({ matchId: gameState.current.matchId, winner: gameState.winner, loser: gameState.loser}),
    });

    if (!response.ok) {
        logger.error("Failed to fetch new game from gateway", { status: response.status });
        throw new Error("failed to fetch new game");
    }

    const obj: GameObject = await response.json();
    logger.info("Next game fetched successfully", { nextMatchId: obj.matchId });
    return obj;
}

function handleInput(code: string, pressed: boolean) {
    logger.info("Player input received", { code, pressed });

    if (code === 'ArrowUp')
        playerKeys.right.up = pressed;
    if (code === 'ArrowDown')
        playerKeys.right.down = pressed;
    if (code === 'KeyW')
        playerKeys.left.up = pressed;
    if (code === 'KeyS')
        playerKeys.left.down = pressed;
    if (code === 'Escape') {
        logger.info("Game cancelled by player");
        if (interval) clearInterval(interval);
        resetSpecs(-1);
    }
}
