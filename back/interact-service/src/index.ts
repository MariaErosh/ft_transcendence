import Fastify from 'fastify';
import { initDB } from './db/database';
import { registerFriendRoutes } from './routes/friends';
import { registerProfileRoutes } from './routes/profiles';

const PORT = parseInt(process.env.PORT || '3006');
const HOST = process.env.HOST || '0.0.0.0';

const server = Fastify({
	logger: true
});

async function start() {
	try {
		// Initialize database
		await initDB();

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
