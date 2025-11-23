import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import "@fastify/jwt";
import logger from "../../../../observability/dist/log/logger"; // Import logger
import { dbErrors, authAttempts } from "../../../../observability/dist/metrics/metrics"; // Import metrics

export default fp(async function (fastify: FastifyInstance) {
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
        logger.info("Authenticating request", { url: request.url, method: request.method }); // Log authentication attempt
        await request.jwtVerify();
        authAttempts.labels("success", process.env.SERVICE_NAME).inc(); // Increment successful auth counter
        logger.info("Authentication successful", { user: request.user }); // Log successful authentication
      } catch (err) {
        logger.error("Authentication failed", { error: err.message, url: request.url }); // Log authentication failure
        authAttempts.labels("failed", process.env.SERVICE_NAME).inc(); // Increment failed auth counter
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
}
*/
