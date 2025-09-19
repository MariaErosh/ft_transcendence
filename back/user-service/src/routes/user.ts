import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { UserService } from "../services/userService";

interface JwtUserPayload {
  sub: number;
  username?: string;
  service?: string;
  [key: string]: any;
}

export async function userRoutes(fastify: FastifyInstance, service: UserService) {
  fastify.get("/users", {preHandler: [fastify.authenticate]}, async (req, reply) => {
    return service.getAll();
  });

  // GEt my profile
  fastify.get("/users/me", { preHandler: [fastify.authenticate] }, async (req, reply) => {
	const auth_user_id = (req.user as JwtUserPayload).sub

	const user = await service.getUserByAuthUserId(auth_user_id);
	if (!user) return reply.status(404).send({ error: "User not found" });
	return user;
  });

   // GET user by auth_user_id ----Delete?
  /*fastify.get("/users/auth/:usrid", {preHandler: [fastify.authenticate]}, async (req, reply) => {
    const { usrid } = req.params as { usrid: string };
	const auth_user = req.user as JwtUserPayload;
	const auth_user_id = auth_user.sub;
	
	if (auth_user_id !== Number(usrid)) {
			return reply.status(403).send({ error: "Forbidden" });
	}
    const user = await service.getUserByAuthUserId(auth_user_id);
    if (!user) return reply.status(404).send({ error: "User not found" });
    return user;
  });

  // GET user by ID 
  fastify.get("/users/:id", {preHandler: [fastify.authenticate]}, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = await service.getUserById(Number(id));
    if (!user) return reply.status(404).send({ error: "User not found" });
    return user;
  });
  */

  // create user (only authorized)
  fastify.post(
	"/users", 
	{preHandler: [fastify.authenticate]}, 
	async (req: FastifyRequest, reply: FastifyReply) => {
		const user = req.user as JwtUserPayload;

		if (!user || user.service !== "auth") {
			return reply.status(403).send({ error: "Forbidden" });
		}
	const auth_user_id = user.sub;
	const {/* auth_user_id,*/ username, email } = req.body as {
      //auth_user_id: number; --> in jwtToken
	  username: string;
      email: string;
    };

	if (auth_user_id == null || !username?.trim() || !email?.trim()) {
		return reply.status(400).send({ error: "Missing required fields" });
    }
	try {
		const user = await service.createUser(auth_user_id, username, email);
		return reply.code(201).send(user);
	} catch (err : any) {
		return reply.status(500).send({error: err.message});
	}
 });

 //todo: decide who can delete and prevent error in authService; maybe exclude this route
 fastify.delete("/users/:id", {preHandler: [fastify.authenticate]}, async (req, reply) => {
	const { id } = req.params as { id: string };
	try {
		const deleted = await service.deleteUser(Number(id));
		if (!deleted) {
			return reply.status(404).send({ error: "Deletion failed" });
		}
		return reply.status(204).send({message: "User deleted"	});
	} catch (err: any) {
		return reply.status(500).send({ error: err.message });
	}
  });
  
 
  //PUT  ??

}
