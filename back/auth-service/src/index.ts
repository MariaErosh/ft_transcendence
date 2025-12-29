import Fastify from "fastify";
import cors from "@fastify/cors";
//import jwt from "@fastify/jwt";
import { initDB } from "./db/database";
import { authRoutes } from "./routes/auth";
import  authPlugin  from "./plugins/authPlugins";
import metricsPlugin from "fastify-metrics";

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

server.register(authPlugin);
server.register(metricsPlugin, { endpoint: '/metrics' });
server.register(cors, { origin: true });

initDB();

const start = async () => {
  await authRoutes(server);

  server.get("/health", async () => ({ status: "ok" }));

  try {
    await server.listen({ port: 3001, host: "0.0.0.0" });
    server.log.info("Auth service running on http://0.0.0.0:3001");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
