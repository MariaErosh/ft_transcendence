import Fastify from "fastify";
import cors from "@fastify/cors";
//import jwt from "@fastify/jwt";
import { initDB } from "./db/database";
import { authRoutes } from "./routes/auth";
import  authPlugin  from "./plugins/authPlugins";


const server = Fastify({ logger: true });

server.register(authPlugin);
server.register(cors, { origin: true });
//todo: store the secret key in normal way
//server.register(jwt, { secret: "!TheLastProjectIn42!" });

initDB();

const start = async () => {
  await authRoutes(server);

  server.get("/health", async () => ({ status: "ok" }));

  try {
    await server.listen({ port: 3001, host: "0.0.0.0" });
    console.log("Auth service running on http://localhost:3001");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
