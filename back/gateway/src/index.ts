import Fastify from "fastify";
import proxy from "@fastify/http-proxy";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import dotenv from "dotenv";
import logger from "../observability/dist/log/logger"; // Import logger
import { register, httpRequestsTotal, apiLatency } from "../observability/dist/metrics/metrics"; // Import metrics

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = (process.env.JWT_SECRET || "secret") as string; // Add default value
const GATEWAY_SECRET = (process.env.GATEWAY_SECRET || "gateway-secret") as string; // Add default value
const AUTH_URL = process.env.AUTH_URL ?? "http://localhost:3001";
const USER_URL = process.env.USER_URL ?? "http://localhost:3002";
const GENGINE_URL = process.env.GENGINE_URL ?? "http://localhost:3003";
const MATCH_SERVICE_URL = process.env.MATCH_SERVICE_URL ?? "http://localhost:3004";

async function buildServer() {
    const server = Fastify({ logger: true });

    await server.register(cors, { origin: true });
    await server.register(jwt, { secret: JWT_SECRET });

    // Helper: list, where gateway must validate access token
    const PROTECTED_PREFIXES = [
        "/users",
        "/auth/2fa/enable"
    ];

    // Validate JWT for protected routes and add x-user-* headers
    server.addHook("onRequest", async (request, reply) => {
        const url = (request.raw.url || "").split("?")[0];

        if (PROTECTED_PREFIXES.some(p => url === p || url.startsWith(p + "/"))) {
            try {
                logger.info("Validating JWT token", { url, method: request.method }); // Log JWT validation attempt
                await request.jwtVerify();
                const user = request.user as any;
                (request.headers as any)['x-user-id'] = String(user.sub || "");
                (request.headers as any)['x-username'] = String(user.username || "");
                (request.headers as any)['x-user-service'] = String(user.service || "user");
                (request.headers as any)['x-gateway-secret'] = GATEWAY_SECRET;
                logger.info("JWT token validated successfully", { userId: user.sub }); // Log successful validation
            } catch (err) {
                logger.error("JWT token validation failed", { url, error: err }); // Log validation failure
                httpRequestsTotal.labels(request.method, url, "401", process.env.SERVICE_NAME || "gateway").inc(); // Track failed auth
                reply.status(401).send({ error: "Unauthorized" });
                throw err;
            }
        } else {
            // For unprotected routes add header x-gateway-secret
            (request.headers as any)['x-gateway-secret'] = GATEWAY_SECRET;
            logger.info("Public route accessed", { url, method: request.method }); // Log public route access
        }
    });

    // Track request metrics with onResponse hook
    server.addHook("onResponse", async (request, reply) => {
        const url = (request.raw.url || "").split("?")[0];
        const startTime = (reply as any).startTime || Date.now();
        const duration = (Date.now() - startTime) / 1000;
        const statusCode = reply.statusCode;

        httpRequestsTotal.labels(request.method, url, String(statusCode), process.env.SERVICE_NAME || "gateway").inc(); // Track HTTP requests
        apiLatency.labels(url, process.env.SERVICE_NAME || "gateway").observe(duration); // Track latency

        logger.info("Gateway request completed", { // Log completed request
            method: request.method,
            url,
            statusCode,
            duration: `${duration.toFixed(3)}s`
        });
    });

    // Track request start time with onRequest hook
    server.addHook("onRequest", async (request, reply) => {
        (reply as any).startTime = Date.now();
    });

    // Proxy registrations
    await server.register(proxy, {
        upstream: AUTH_URL,
        prefix: "/auth",
        rewritePrefix: "/auth",
        http2: false,
    });

    logger.info("Auth service proxy registered", { upstream: AUTH_URL }); // Log proxy registration

    await server.register(proxy, {
        upstream: USER_URL,
        prefix: "/users",
        rewritePrefix: "/users",
        http2: false,
    });

    logger.info("User service proxy registered", { upstream: USER_URL }); // Log proxy registration

    await server.register(proxy, {
        upstream: GENGINE_URL,
        prefix: "/game",
        rewritePrefix: "/game",
        http2: false,
    });

    logger.info("Game engine proxy registered", { upstream: GENGINE_URL }); // Log proxy registration

    // Health check endpoint
    server.get("/health", async () => {
        logger.info("Health check requested"); // Log health check
        return {
            status: "ok",
            ts: new Date().toISOString(),
        };
    });

    // Metrics endpoint for Prometheus
    server.get("/metrics", async (request, reply) => {
        logger.info("Metrics endpoint accessed"); // Log metrics access
        reply.type(register.contentType);
        return await register.metrics();
    });

    await server.register(proxy, {
        upstream: MATCH_SERVICE_URL,
        prefix: "/match",
        rewritePrefix: "/match",
        http2: false,
    });

    logger.info("Match service proxy registered", { upstream: MATCH_SERVICE_URL }); // Log proxy registration

    return server;
}

async function start() {
    try {
        const server = await buildServer();
        await server.listen({ port: PORT, host: "0.0.0.0" });
        logger.info("Gateway started successfully", { port: PORT, host: "0.0.0.0" }); // Log successful start
        server.log.info(`Gateway listening on http://0.0.0.0:${PORT}`);
    } catch (err) {
        logger.error("Failed to start gateway", { error: err }); // Log startup error
        console.error(err);
        process.exit(1);
    }
}

start();
