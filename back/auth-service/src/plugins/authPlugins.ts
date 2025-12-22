import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import "@fastify/jwt";

export default fp(async function (fastify: FastifyInstance) {
  fastify.log.info("Initializing Auth Plugin");
  //setting up JWT
  fastify.register(fastifyJwt, {
	//todo: secret key!
	secret: "!TheLastProjectIn42!"
  });

  //new method for the Fastify instance to check JWT in preHandler
  fastify.decorate(
	"authenticate",
	async function (request: FastifyRequest, reply: FastifyReply) { //function that will run when call fastify.authenticate" call
	  try {
		await request.jwtVerify();
	  } catch (err) {
		request.log.error({ err }, "Authentication failed");
		reply.status(401).send({ error: "Unauthorized",  details: err});
	  }
	}
  );
});

/*
	Extend Fastify's TypeScript types to include our custom properties and methods.
	This allows TypeScript to recognize `fastify.authenticate` on the server instance
	and `request.user` on the request object without type errors
*/
/*declare module "fastify" {
  interface FastifyInstance {
	authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

  interface FastifyRequest {
	user: string | object | Buffer<ArrayBufferLike>;
  }
}*/
