import Fastify from "fastify";
import { db, initDB } from "./db/database";
import { UserService } from "./services/userService";
import { userRoutes } from "./routes/user";
//import  authPlugin  from "./plugins/authPlugin";
import metricsPlugin from "fastify-metrics";
import dotenv from "dotenv";

dotenv.config();


export function requiredEnv(key: string): string {
	const v = process.env[key];
	if (!v) throw new Error(`Missing required environment variable: ${key}`);
	return v;
}

const USER_PORT = requiredEnv("USER_PORT");
const USER_URL = requiredEnv("USER_SERVICE") + USER_PORT;


async function start() {
	const fastify = Fastify({
		logger: {
			level: 'info',
			transport: {
				targets: [
					{ target: 'pino/file', options: { destination: 1 } }, // stdout
					{
						target: 'pino-socket',
						options: { address: 'logstash', port: 5000, mode: 'tcp', reconnect: true } // Logstash
					}
				]
			}
		}
	});
	await fastify.register(metricsPlugin, { endpoint: '/metrics' });

	//todo: store the secret key in normal way
	//(fastify as any).register(jwt, { secret: "!TheLastProjectIn42!" });
	// register plugin
  	//await fastify.register(authPlugin);

	initDB();

	//create UserService instance (injecting db)
	const userService = new UserService(db);

	//register the plugin and wait for it to finish
	//await fastify.register(authPlugin);

	// Routs registration (injecting userService)
	//userRoutes(fastify, userService);
	await fastify.register(async(instance) =>{
		userRoutes(instance, userService);
	});

	await fastify.listen({ port: Number(USER_PORT), host: "0.0.0.0"  }, (err, address) => {
		if (err) {
			console.error(err);
			process.exit(1);
		}
		console.log("User service running on ", USER_URL);
	});
}

start();
