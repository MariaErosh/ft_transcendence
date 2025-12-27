// import fp from "fastify-plugin";
// import fastifyJwt from "@fastify/jwt";
// import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

// interface JwtUserPayload {
//   sub: number;
//   username?: string;
//   service?: string;
//   [key: string]: any;
// }

// export default fp(async function (fastify: FastifyInstance) {
//   //setting up JWT 
//   fastify.register(fastifyJwt, { 
// 	//todo: secret key!
//     secret: "!TheLastProjectIn42!"
//   });

//   //new method for the Fastify instance to check JWT in preHandler
//   fastify.decorate(
//     "authenticate",
//     async function (request: FastifyRequest, reply: FastifyReply) { //function that will run when call fastify.authenticate" call
//       try {
//         await request.jwtVerify();
// 		//await (request as FastifyRequest & { jwtVerify: () => Promise<void> }).jwtVerify();
//       } catch (err) {
//         reply.status(401).send({ error: "Unauthorized",  details: err});
//       }
//     }
//   );
// });

// /* 
// 	Extend Fastify's TypeScript types to include our custom properties and methods.
// 	This allows TypeScript to recognize `fastify.authenticate` on the server instance
// 	and `request.user` on the request object without type errors 
// */
// // Extend @fastify/jwt types
// import "@fastify/jwt";

// declare module "@fastify/jwt" {
//   interface FastifyJWT {
// 	payload: JwtUserPayload; 
// 	user: JwtUserPayload;
//   }
// }

// // Extend Fastify types (only for authenticate)
// declare module "fastify" {
//   interface FastifyInstance {
//     authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//   }
// }

