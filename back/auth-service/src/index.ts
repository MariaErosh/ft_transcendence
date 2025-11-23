import Fastify from "fastify";
import cors from "@fastify/cors";
//import jwt from "@fastify/jwt";
import { initDB } from "./db/database";
import { authRoutes } from "./routes/auth";
import authPlugin from "./plugins/authPlugins";
import logger from "../../../../observability/dist/log/logger"; // Import logger
import { register } from "../../../../observability/dist/metrics/metrics"; // Import metrics

const server = Fastify({ logger: true });

server.register(authPlugin);
server.register(cors, { origin: true });
//todo: store the secret key in normal way
//server.register(jwt, { secret: "!TheLastProjectIn42!" });

initDB();

const start = async () => {
  await authRoutes(server);

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

  try {
    await server.listen({ port: 3001, host: "0.0.0.0" });
    logger.info("Auth service started successfully", { port: 3001 });
    console.log("Auth service running on http://localhost:3001");
  } catch (err) {
    logger.error("Failed to start auth service", { error: err });
    server.log.error(err);
    process.exit(1);
  }
};

start();
