import Fastify from 'fastify';
import metricsPlugin from 'fastify-metrics';
import { initDB } from './db/database';
import { registerFriendRoutes } from './routes/friends';
import { registerProfileRoutes } from './routes/profiles';
import dotenv from "dotenv";

dotenv.config();


export function requiredEnv(key: string): string {
	const v = process.env[key];
	if (!v) throw new Error(`Missing required environment variable: ${key}`);
	return v;
}

const PORT = parseInt(requiredEnv("INTERACT_PORT"));
const HOST = '0.0.0.0';
export const GATEWAY_SECRET = requiredEnv("GATEWAY_SECRET");
export const USER_URL = requiredEnv("USER_SERVICE") + ":" + requiredEnv("USER_PORT");
export const GATEWAY_URL = requiredEnv("GATEWAY_SERVICE") + ":" + requiredEnv("GATEWAY_PORT");

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

async function start() {
	try {
		// Initialize database
		await initDB();

		// Register plugins
		await server.register(metricsPlugin, { endpoint: '/metrics' });

		// Register routes
		registerFriendRoutes(server);
		registerProfileRoutes(server);

		// Health check
		server.get('/health', async () => {
			return { status: 'ok', service: 'interact-service' };
		});

		// Start server
		await server.listen({ port: PORT, host: HOST });
		console.log(`🚀 Interact service running on http://${HOST}:${PORT}`);
	} catch (err) {
		server.log.error(err);
		process.exit(1);
	}
}

start();
