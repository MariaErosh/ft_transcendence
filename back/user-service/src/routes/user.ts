import { FastifyInstance } from "fastify";
import { UserService } from "../services/userService";

export async function userRoutes(fastify: FastifyInstance, service: UserService) {
  fastify.get("/users", async (req, reply) => {
    return service.getAll();
  });

  fastify.get("/users/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = await service.getUserById(Number(id));
    if (!user) return reply.status(404).send({ error: "User not found" });
    return user;
  });

  fastify.get("/users/auth/:usrid", async (req, reply) => {
    const { usrid } = req.params as { usrid: string };
    const user = await service.getUserByAuthUserId(Number(usrid));
    if (!user) return reply.status(404).send({ error: "User not found" });
    return user;
  });

  fastify.post("/users", async (req, reply) => {
    const { auth_user_id, username, email } = req.body as {
      auth_user_id: number;
	  username: string;
      email: string;
    };
    const user = await service.createUser(auth_user_id, username, email);
    return reply.code(201).send(user);
  });

  fastify.delete("/users/:id", async (req, reply) => {
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
