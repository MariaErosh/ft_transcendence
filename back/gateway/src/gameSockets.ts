import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import websocketPlugin from "@fastify/websocket";
//import { WebSocket } from "ws";
import WebSocket from 'ws';
import { PlayerPayload } from "./management_sockets";


// Map: gameId → side ("left" | "right") → connection info
const gameSideConnections = new Map<
  number,                                 // gameId
  Map<"left" | "right", {                 // side
    engineWs: WebSocket;
    frontendWs: Set<WebSocket>;           
    userId: number;
    pendingMessages: string[];
  }>
>();

export async function registerGameWebSocket(server: FastifyInstance) {
	server.get("/game/ws", { websocket: true }, async (connection, req) => {
		const frontendWs = connection;
		const query = req.query as { gameId?: string; token?: string; side?: string };
		const gameId = Number(query.gameId);
	
		if (isNaN(gameId) || !query.token) {
		  return frontendWs.close(1008, "Invalid params");
		}

		let player: PlayerPayload;
		try {
		player = server.jwt.verify<PlayerPayload>(query.token);
		} catch {
		console.log("Returning from registerGameWebsocket: token");
		return frontendWs.close(1008, "Invalid token");
		}

	  //CONSDER checking in DB instead of passing as a query
		const side = query.side as "left" | "right";
		if (!side || !["left", "right"].includes(side)) {
		  return frontendWs.close(1008, "Not in this game");
		}
		
	  
		if (!gameSideConnections.has(gameId)) {
		  gameSideConnections.set(gameId, new Map());
		}
		const sidesMap = gameSideConnections.get(gameId)!;
	  
		let sideConn = sidesMap.get(side);
          

		if (!sideConn) {
	  
		console.log("Gateway attempting to connect socket on ", `ws://${process.env.GENGINE_URL!.replace(/^https?:\/\//, "")}/ws` +
                `?gameId=${gameId}&side=${side}&player=${player.username}`);

		const engineWs = new WebSocket(
			`ws://${process.env.GENGINE_URL!.replace(/^https?:\/\//, "")}/ws` +
			`?gameId=${gameId}&side=${side}&player=${player.username}`
		  );
	  
		// store messages that arrive before sockets are all fully open
		const pendingMessages: string[] = [];
		engineWs.on("open", () => {
			console.log("Engine WS open");
			pendingMessages.forEach(msg => 
				engineWs.send(typeof msg === "string" ? msg: JSON.stringify(msg)));
			pendingMessages.length = 0;
		});

		  sideConn = {
			engineWs,
			frontendWs: new Set(),
			userId: player.sub,
			pendingMessages,
		  };
		  sidesMap.set(side, sideConn);
	  
		  engineWs.on("message", (data) => {
			const str = (typeof data === "string") ? data : data.toString();
			//console.log("gateway socket sending message", data);
			sideConn!.frontendWs.forEach(ws => {
			  if (ws.readyState === WebSocket.OPEN) ws.send(str);
			});
		  });
	  
		  engineWs.on("close", () => {
			sideConn!.frontendWs.forEach(ws => ws.close());
			sidesMap.delete(side);
			if (sidesMap.size === 0) gameSideConnections.delete(gameId);
		  });
	  
		  engineWs.on("error", console.error);
		}
	  
		sideConn.frontendWs.add(frontendWs);
	  
		frontendWs.on("message", (msg: Buffer) => {
			console.log("gateway socket receiving message", msg);
		  if (sideConn!.engineWs.readyState === WebSocket.OPEN) {
			sideConn!.engineWs.send(msg);
		  } else {
			sideConn!.pendingMessages.push(msg.toString());
		  }
		});
	  
		frontendWs.on("close", () => {
		  sideConn!.frontendWs.delete(frontendWs);
		  if (sideConn!.frontendWs.size === 0) {
			sideConn!.engineWs.close();
			sidesMap.delete(side);
			if (sidesMap.size === 0) gameSideConnections.delete(gameId);
		  }
		});
	  });
	}
