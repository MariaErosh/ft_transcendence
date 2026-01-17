import { database, initDB } from "./db/database";
import Fastify from 'fastify'
import { MatchService } from "./match-service";
import { matchRoutes } from "./match-service-controllers";
import metricsPlugin from "fastify-metrics";
import { requiredEnv } from "./match-service-controllers";

const MATCH_PORT = Number(requiredEnv("MATCH_PORT"));


async function runMatchService() {
	const fastify = Fastify({
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
	await fastify.register(metricsPlugin, { endpoint: '/metrics' });

	initDB();
	const matchService = new MatchService(database);


	await matchRoutes(fastify, matchService);

	fastify.listen({ port: MATCH_PORT, host: "0.0.0.0" }, (err, address) => {
		if (err) {
			fastify.log.error(err);
			process.exit(1);
		}
		fastify.log.info(`Match service running on ${address}`);
	});
}

runMatchService();
