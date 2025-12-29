import Fastify from "fastify";
import proxy from "@fastify/http-proxy";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import dotenv from "dotenv";
import metricsPlugin from "fastify-metrics";

dotenv.config();
import { getMatchPlayers, getOpenMatches, notifyAboutNewGame, registerGatewayWebSocket, notifyEndMatch, notifyAboutNewConsoleGame } from "./lobbySockets";
import { registerGameWebSocket } from "./gameSockets";
import { registerChatWebSocket } from "./chatSockets";



const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET as string;
const GATEWAY_SECRET = process.env.GATEWAY_SECRET as string;
const AUTH_URL = process.env.AUTH_URL ?? "http://localhost:3001";
const USER_URL = process.env.USER_URL ?? "http://localhost:3002";
const GENGINE_URL = process.env.GENGINE_URL ?? "http://localhost:3003";
const MATCH_SERVICE_URL = process.env.MATCH_SERVICE_URL ?? "http://localhost:3004";
const CHAT_URL = process.env.CHAT_URL ?? "http://localhost:3005";
const onlineUsers = new Map<number, number>();

function markUserOnline(userId: number) {
	onlineUsers.set(userId, Date.now());
}

function getOnlineUsers(): number[] {
	const cutoff = Date.now() - 120_000; // 2 minutes timeout
	for (const [id, lastSeen] of onlineUsers.entries()) {
		if (lastSeen < cutoff) onlineUsers.delete(id);
	}
	return [...onlineUsers.keys()];
}

async function buildServer() {
	const server = Fastify({
		logger: {
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
		}
	});

	await server.register(metricsPlugin, { endpoint: '/metrics' });
	await server.register(cors, {
		origin: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true
	});
	await server.register(jwt, { secret: JWT_SECRET });

	//websocket registration
	await registerGatewayWebSocket(server);
	await registerGameWebSocket(server);
	await registerChatWebSocket(server);

	// helper:list, where gateway must validate access token
	const PROTECTED_PREFIXES = [
		"/users",
		"/auth/2fa/enable",
		"/check",
		"/chat/messages",  // Protect REST endpoint, but not /chat/ws WebSocket
		"/chat/blocks",
		"/chat/conversations",
		"/chat/users/online",
		"/interact"
	];
	//validate JWT for protected routes and add x-user-* headers
	server.addHook("onRequest", async (request, reply) => {
		const url = (request.raw.url || "").split("?")[0];

		if (PROTECTED_PREFIXES.some(p => url === p || url.startsWith(p + "/"))) {
			try {
				await request.jwtVerify();
				const userId = (request.user as any).sub;
				(request.headers as any)['x-user-id'] = String((request.user as any).sub);
				(request.headers as any)['x-username'] = String((request.user as any).username ?? "");
				(request.headers as any)['x-user-service'] = String((request.user as any).service ?? "user");
				(request.headers as any)['x-gateway-secret'] = GATEWAY_SECRET;
			} catch (err) {
				reply.status(401).send({ error: "Unauthorized" });
				throw err;
			}
		} else {
			//for unprotected routes add header x-gateway-secret
			(request.headers as any)['x-gateway-secret'] = GATEWAY_SECRET;
		}

	});

	// Proxy registrations
	await server.register(proxy, {
		upstream: AUTH_URL,
		prefix: "/auth",
		rewritePrefix: "/auth",
		http2: false,
	});

	await server.register(proxy, {
		upstream: USER_URL,
		prefix: "/users",
		rewritePrefix: "/users",
		http2: false,
	});

	await server.register(proxy, {
		upstream: GENGINE_URL,
		prefix: "/game",
		rewritePrefix: "/game",
		http2: false,
	});

	await server.register(proxy, {
		upstream: CHAT_URL,
		prefix: "/chat",
		rewritePrefix: "/chat",
		http2: false,
	});

	await server.register(proxy, {
		upstream: process.env.INTERACT_URL || "http://interact:3006",
		prefix: "/interact",
		rewritePrefix: "/interact",
		http2: false,
	});

	server.get("/health", async () => ({
		status: "ok",
		ts: new Date().toISOString(),
	}));

	server.get("/check", ()=>({ ok: true }));

	await server.register(proxy, {
		upstream: MATCH_SERVICE_URL,
		prefix: "/match",
		rewritePrefix: "/match",
		http2: false,
	});

	server.get("/open", async () => {
		return { matches: getOpenMatches() };
	})

	server.post("/players", async (req, response) => {
		let matchName = (req.body as {matchName:string}).matchName;
		return { players: getMatchPlayers(matchName) };
	})

	server.post("/newround", async (req, response) => {
		let res = (req.body as {matchName:string, games: any[]});
		await notifyAboutNewGame(res.games, res.matchName);
	})

	server.post("/newgame", async (req, response) => {
		let res = (req.body as {matchName: string, game: any});
		server.log.info({ game: res.game }, "New console game received");
		await notifyAboutNewConsoleGame(res.game, res.matchName);
	})


	server.post("/end_match", async (req, response) => {
		let res = (req.body as {matchName:string, matchId: number, winnerAlias: string, winnerId: number});
		await notifyEndMatch(res.matchName, res.matchId, res.winnerAlias, res.winnerId);
	})
	return server;
}


async function start() {
	let server;
	try {
		server = await buildServer();
		await server.listen({ port: PORT, host: "0.0.0.0" });
		server.log.info(`Gateway listening on http://0.0.0.0:${PORT}`);
	} catch (err) {
		if (server) server.log.error(err);
		else console.error(err);
		process.exit(1);
	}
}

start();
