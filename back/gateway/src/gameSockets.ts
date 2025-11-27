import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import websocketPlugin from "@fastify/websocket";
//import { WebSocket } from "ws";
import WebSocket from 'ws';
import { PlayerPayload } from "./management_sockets";

const gameConnections = new Map<
	number,                                 // playerId
	{
		engineWs: WebSocket;
		frontendWs: Set<WebSocket>;
		pendingMessages: string[];
	}
>();

export async function registerGameWebSocket(server: FastifyInstance) {
	server.get("/game/ws", { websocket: true }, async (connection, req) => {
		const frontendWs = connection;
		const query = req.query as { token?: string; };

		if (!query.token) {
			return frontendWs.close(1008, "Invalid params");
		}

		let player: PlayerPayload;
		try {
			player = server.jwt.verify<PlayerPayload>(query.token);
		} catch {
			console.log("Returning from registerGameWebsocket: token");
			return frontendWs.close(1008, "Invalid token");
		}

		if (!gameConnections.has(player.sub)) {
			gameConnections.set(player.sub, { engineWs: null as any, frontendWs: new Set(), pendingMessages: [] });
		}
		const playerSockets = gameConnections.get(player.sub)!;

		playerSockets.frontendWs.add(frontendWs);

		if (!playerSockets.engineWs) {
			console.log("Gateway attempting to connect socket on ", `ws://${process.env.GENGINE_URL!.replace(/^https?:\/\//, "")}/ws` +
				`?player=${player.username}`);

			const engineWs = new WebSocket(
				`ws://${process.env.GENGINE_URL!.replace(/^https?:\/\//, "")}/ws` +
				`?player=${player.username}`
			);

			playerSockets.engineWs = engineWs;

			// store messages that arrive before sockets are all fully open
			const pendingMessages: string[] = [];
			engineWs.on("open", () => {
				console.log("Engine WS open");
				pendingMessages.forEach(msg =>
					engineWs.send(typeof msg === "string" ? msg : JSON.stringify(msg)));
				pendingMessages.length = 0;
			});

			engineWs.on("message", (data) => {
				const str = (typeof data === "string") ? data : data.toString();
				playerSockets.frontendWs.forEach(ws => {
					if (ws.readyState === WebSocket.OPEN) ws.send(str);
				});
			});

			engineWs.on("close", () => {
				playerSockets.frontendWs.forEach(ws => ws.close());
				gameConnections.delete(player.sub);
			});

			engineWs.on("error", console.error);
		}

		frontendWs.on("message", (msg: Buffer) => {
			console.log("gateway socket receiving message", msg);
			if (playerSockets.engineWs.readyState === WebSocket.OPEN) {
				playerSockets.engineWs.send(msg);
			} else {
				playerSockets.pendingMessages.push(msg.toString());
			}
		});

		frontendWs.on("close", () => {
			playerSockets.frontendWs.delete(frontendWs);
			if (playerSockets.frontendWs.size === 0) {
				playerSockets.engineWs.close();
				gameConnections.delete(player.sub);
			}
		});
	});
}
