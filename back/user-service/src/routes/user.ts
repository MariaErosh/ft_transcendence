import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { UserService } from "../services/userService";
import dotenv from "dotenv";

dotenv.config();

const GATEWAY_SECRET = process.env.GATEWAY_SECRET;

function ensureFromGateway(req: FastifyRequest, reply: FastifyReply) {
	const gw = (req.headers as any)['x-gateway-secret'];
	if (!gw || gw !== GATEWAY_SECRET) {
		reply.status(401).send({ error: "Unauthorized (gateway only)" });
		console.log("User-service: ensureFromGateway", false);
		return false;
	}
	console.log("User-service: ensureFromGateway", true);
	return true;
}

interface JwtUserPayload {
	sub: number;
	username?: string;
	service?: string;
}

export async function userRoutes(fastify: FastifyInstance, service: UserService) {
  
	fastify.get("/users", async (req, reply) => {
		 if (!ensureFromGateway(req, reply)) return;
		return service.getAll();
	});

  //GEt my profile
	fastify.get("/users/me", async (req, reply) => {
		if (!ensureFromGateway(req, reply)) return;
		const auth_user_id = Number((req.headers as any)['x-user-id']); 
		if (!auth_user_id) return reply.status(401).send({ error: "Missing user id" });

		const user = await service.getUserByAuthUserId(auth_user_id);
		if (!user) return reply.status(404).send({ error: "User not found" });
		return user;
  });


   //GET user by auth_user_id ----Delete?
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
  }); */

	// GET /users/:id
	fastify.get("/users/:id", async (req, reply) => {
		if (!ensureFromGateway(req, reply)) return;
		const {id} = req.params as { id: string };
		const user = await service.getUserById(Number(id));
		if (!user) return reply.status(404).send({ error: "User not found" });
		return user;
	});

	//create user (only authorized)
	fastify.post("/users",  
	async (req: FastifyRequest, reply: FastifyReply) => {
		console.log("User-service: ");
		if (!ensureFromGateway(req, reply)) return;
		console.log("User-service: request from Gateway");
		const authUserIdHeader = (req.headers as any)['x-user-id'];
		const authUserService = (req.headers as any)['x-user-service'];

		// allow creation only if request comes from auth service
		// if creation is a result of registration > service='auth'
		const auth_user_id = authUserIdHeader ? Number(authUserIdHeader) : null;
		
		//if the call originates from auth-service, x-user-service is 'auth'
		if (authUserService !== 'auth' && !auth_user_id) {
			 console.log("User-service: forbidden request. authUserService=", authUserService, "auth_user_id=", auth_user_id);
			return reply.status(403).send({ error: "Forbidden" });
		}

		const { username, email } = req.body as { username: string; email: string; };
		try {
			const created = await service.createUser(auth_user_id!, username, email);
			console.log("User-service: user created successfully:", created);
			return reply.code(201).send(created);
		} catch (err: any) {
			console.error("User-service: error creating user:", err.message, err.stack);
			return reply.status(500).send({ error: err.message });
		}		
 	});

 //todo: decide who can delete and prevent error in authService; maybe exclude this route
 fastify.delete("/users/:id", async (req, reply) => {
	if (!ensureFromGateway(req, reply)) return;

	const { id } = req.params as { id: string };
	const authUserId = Number((req.headers as any)['x-user-id']);
	const user = await service.getUserById(Number(id));
	if (!user) return reply.status(404).send({ error: "User not found" });
	// owner check
	if (user.auth_user_id !== authUserId) return reply.status(403).send({ error: "Forbidden" });

	try {
		const deleted = await service.deleteUser(Number(id));
		if (!deleted) return reply.status(500).send({ error: "Deletion failed" });
		return reply.status(204).send();
	} catch (err: any) {
		return reply.status(500).send({ error: err.message });
	}
  });
  
 
   // PUT /users/:auth_user_id — update profile 
  fastify.put("/users/:auth_user_id", async (req, reply) => {
    if (!ensureFromGateway(req, reply)) return;

    const { auth_user_id } = req.params as { auth_user_id: string };
    const authUserId = Number((req.headers as any)['x-user-id']);
    const { displayName } = req.body as { displayName: string };
    const user = await service.getUserByAuthUserId(Number(auth_user_id));

    if (!user) return reply.status(404).send({ error: "User not found" });
    //update own profile
	if (user.auth_user_id !== authUserId) return reply.status(403).send({ error: "Forbidden" });

    const updated = await service.updateUserByAuthId(Number(auth_user_id), {displayName});
    return reply.send(updated);
  });

}
