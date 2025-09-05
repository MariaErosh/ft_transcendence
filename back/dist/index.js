"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
require("./db/database");
const auth_1 = require("./routes/auth");
const server = (0, fastify_1.default)({ logger: true });
server.register(cors_1.default);
server.register(jwt_1.default, { secret: "!TheLastProjectIn42!" });
server.register(websocket_1.default);
// routers
server.register(auth_1.authRoutes);
// health check
server.get("/health", async () => ({ status: "ok" }));
server.ready().then(() => {
    console.log(server.printRoutes());
});
server.listen({ port: 3000, host: "0.0.0.0" }, (err, address) => {
    if (err) {
        server.log.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
});
