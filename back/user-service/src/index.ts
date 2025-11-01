import Fastify from "fastify";
import { db, initDB } from "./db/database";
import { UserService } from "./services/userService";
import { userRoutes } from "./routes/user";
import  authPlugin  from "./plugins/authPlugin";


async function start() {
	const fastify = Fastify({ logger: true });

	//todo: store the secret key in normal way
	//(fastify as any).register(jwt, { secret: "!TheLastProjectIn42!" });
	// register plugin
  	await fastify.register(authPlugin);
	
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

	await fastify.listen({ port: 3002 }, (err, address) => {
		if (err) {
			console.error(err);
			process.exit(1);
		}
		console.log("User service running on http://localhost:3002");
	});
}

start();