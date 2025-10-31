import { database, initDB } from "./db/database"; 
import Fastify from 'fastify'
import { MatchService } from "./match-service";
import { matchRoutes } from "./match-service-controllers";


async function runMatchService() {
	const fastify = Fastify({ logger: true });

	initDB();
	const matchService = new MatchService(database);


	await fastify.register(async(instance) =>{
		matchRoutes(instance, matchService);
	});

	fastify.listen({ port: 3004 }, (err, address) => {
		if (err) {
			console.error(err);
			process.exit(1);
		}
		console.log("Match service running on http://localhost:3004");
	});
}

runMatchService();
