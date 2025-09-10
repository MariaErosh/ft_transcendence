import Fastify from "fastify";
import { db, initDB } from "./db/database";
import { UserService } from "./services/userService";
import { userRoutes } from "./routes/user";

async function start() {
  const fastify = Fastify();

  initDB();

  //create UserService instance (injecting db)
  const userService = new UserService(db);

  // Routs registration (injecting userService)
  userRoutes(fastify, userService);

  fastify.listen({ port: 3002 }, (err, address) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
    console.log("User service running on http://localhost:3002");
  });
}

start();