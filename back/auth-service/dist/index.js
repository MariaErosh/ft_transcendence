"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
//import jwt from "@fastify/jwt";
const database_1 = require("./db/database");
const auth_1 = require("./routes/auth");
const authPlugins_1 = __importDefault(require("./plugins/authPlugins"));
const server = (0, fastify_1.default)({ logger: true });
server.register(authPlugins_1.default);
server.register(cors_1.default, { origin: true });
//todo: store the secret key in normal way
//server.register(jwt, { secret: "!TheLastProjectIn42!" });
(0, database_1.initDB)();
const start = async () => {
    await (0, auth_1.authRoutes)(server);
    server.get("/health", async () => ({ status: "ok" }));
    try {
        await server.listen({ port: 3001, host: "0.0.0.0" });
        console.log("Auth service running on http://localhost:3001");
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
