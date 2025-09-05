import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import websocket from "@fastify/websocket";
import "./db/database";
import { authRoutes } from "./routes/auth";

const server = Fastify({ logger: true });

server.register(cors);
server.register(jwt, { secret: "!TheLastProjectIn42!" });
server.register(websocket);

// routers
server.register(authRoutes);

// health check
server.get("/health", async () => ({ status: "ok" }));

server.ready().then(() => {
  console.log(server.printRoutes());
});

server.listen({ port: 3000, host: "0.0.0.0" }, (err, address) => {
	if (err) {
		server.log.error(err);
		process.exit(1);
	}
	console.log(`Server listening at ${address}`);
});
