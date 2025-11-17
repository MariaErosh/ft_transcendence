import Fastify from "fastify";
import proxy from "@fastify/http-proxy";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import dotenv from "dotenv";

dotenv.config();

import { registerGatewayWebSocket } from "./sockets"; //import after dotenv load so the variables are available inside th module	

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET as string;
const GATEWAY_SECRET = process.env.GATEWAY_SECRET as string;
const AUTH_URL = process.env.AUTH_URL ?? "http://localhost:3001";
const USER_URL = process.env.USER_URL ?? "http://localhost:3002";
const GENGINE_URL = process.env.GENGINE_URL ?? "http://localhost:3003";
const MATCH_SERVICE_URL = process.env.MATCH_SERVICE_URL ?? "http://localhost:3004";
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
	const server = Fastify({ logger: true });

	await server.register(cors, { origin: true });
	await server.register(jwt, { secret: JWT_SECRET });

	// helper:list, where gateway must validate access token
	const PROTECTED_PREFIXES = [
		"/users",
		"/auth/2fa/enable",
		"/match/remote"
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
				markUserOnline(userId);
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

	server.get("/health", async () => ({
		status: "ok",
		ts: new Date().toISOString(),
	}));

	await server.register(proxy, {
		upstream: MATCH_SERVICE_URL,
		prefix: "/match",
		rewritePrefix: "/match",
		http2: false,
	});

	server.get("/online", async () => {
		return { online: getOnlineUsers() };
	});

	//websocket registration
	await registerGatewayWebSocket(server);

	return server;
}


async function start() {
	try {
		const server = await buildServer();
		await server.listen({ port: PORT, host: "0.0.0.0" });
		server.log.info(`Gateway listening on http://0.0.0.0:${PORT}`);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
}

start();
