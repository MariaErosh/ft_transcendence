"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("../db/database");
async function authRoutes(fastify) {
    // Registration
    fastify.post("/auth/register", async (request, reply) => {
        const { username, password } = request.body;
        if (!username || !password) {
            return reply.status(400).send({ error: "Username and password required" });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        return new Promise((resolve) => {
            database_1.db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], function (err) {
                if (err) {
                    reply.status(400).send({ error: "Username already exists" });
                    return resolve(null);
                }
                else {
                    reply.send({ message: "User registered", id: this.lastID });
                    return resolve(null);
                }
            });
        });
    });
    // Login
    fastify.post("/auth/login", async (request, reply) => {
        const { username, password } = request.body;
        if (!username || !password) {
            return reply.status(400).send({ error: "Username and password required" });
        }
        return new Promise((resolve) => {
            database_1.db.get("SELECT * FROM users WHERE username = ?", [username], async (err, row) => {
                if (err || !row) {
                    reply.status(401).send({ error: "Invalid credentials" });
                    return resolve(null);
                }
                const passwordMatch = await bcrypt_1.default.compare(password, row.password);
                if (!passwordMatch) {
                    reply.status(401).send({ error: "Invalid credentials" });
                    return resolve(null);
                }
                const token = fastify.jwt.sign({ id: row.id, username: row.username });
                reply.send({ token });
                return resolve(null);
            });
        });
    });
    // ****** PROTECTED ROUTES: *******
    fastify.register(async (f) => {
        f.addHook("onRequest", async (request, reply) => {
            await request.jwtVerify();
        });
        f.get("/profile", async (request, reply) => {
            return { user: request.user };
        });
    });
}
