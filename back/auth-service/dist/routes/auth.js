"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const authService_1 = require("../services/authService");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function authRoutes(fastify) {
    const auth = new authService_1.AuthService();
    // Registration
    fastify.post("/auth/register", async (req, reply) => {
        const { username, password, email } = req.body;
        let user = null;
        //function to rollback a created user in auth-service
        const rollbackAuthUser = async () => {
            if (user?.id) {
                try {
                    await auth.deleteUser(user.id);
                    console.log(`Rollback: deleted Auth user ${user.id}`);
                }
                catch (err) {
                    console.error(`Rollback failed for Auth user ${user.id}:`, err);
                }
            }
        };
        try {
            //create record in AuthService
            //todo: update two_factor_auth = true
            user = await auth.createUser(username, password, false);
            if (!user || !user.id)
                throw new Error("User creation failed");
            const systemToken = fastify.jwt.sign({ service: "auth", sub: user.id }, { expiresIn: "1m" });
            const GATEWAY_URL = process.env.GATEWAY_URL;
            if (!GATEWAY_URL)
                throw new Error("USER_URL is not defined in .env");
            //create record in UserSrvice
            let response;
            try {
                response = await fetch(`${GATEWAY_URL}/users`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${systemToken}`
                    },
                    body: JSON.stringify({
                        auth_user_id: user.id,
                        username: username,
                        email: email
                    }),
                });
            }
            catch (userServErr) {
                await rollbackAuthUser();
                throw new Error(`Failed to contact UserService: ${userServErr.message}`);
            }
            if (!response.ok) {
                //await auth.deleteUser(user.id);
                const text = await response.text();
                await rollbackAuthUser();
                return reply.status(500).send({ error: `UserService error: ${text}` });
            }
            const prof = await response.json();
            reply.code(201).send({
                auth_user: user,
                profile: prof
            });
        }
        catch (err) {
            await rollbackAuthUser();
            reply.status(400).send({ error: err.message });
        }
    });
    // Login
    fastify.post("/auth/login", async (req, reply) => {
        const { username, password } = req.body;
        if (!username || !password)
            return reply.status(400).send({ error: "username and password required" });
        try {
            const user = await auth.findUserByUsername(username);
            if (!user)
                return reply.status(401).send({ error: "invalid credentials" });
            const valid = await auth.validatePassword(password, user.password_hash);
            if (!valid)
                return reply.status(401).send({ error: "invalid credentials" });
            if (user.two_factor_enabled) {
                return reply.send({ twoFactorRequired: true, userId: user.id });
            }
            const accessToken = fastify.jwt.sign({ sub: user.id, username: user.username }, { expiresIn: "15m" });
            const { refreshToken, expiresAt } = await auth.createRefreshToken(user.id);
            return reply.send({
                accessToken,
                refreshToken,
                refreshExpiresAt: expiresAt,
            });
        }
        catch (err) {
            return reply.status(500).send({ error: "Internal server error" });
        }
    });
    // Token refresh
    fastify.post("/auth/refresh", async (req, reply) => {
        const { refreshToken } = req.body;
        try {
            const userId = await auth.consumeRefreshToken(refreshToken);
            const accessToken = fastify.jwt.sign({ sub: userId }, { expiresIn: "15m" });
            const { refreshToken: newRefresh, expiresAt } = await auth.createRefreshToken(userId);
            reply.send({ accessToken, refreshToken: newRefresh, refreshExpiresAt: expiresAt });
        }
        catch (err) {
            reply.status(401).send({ error: err.message });
        }
    });
    // Verify token
    fastify.post("/auth/verify", async (req, reply) => {
        const { token } = req.body;
        if (!token)
            return reply.status(400).send({ error: "Token required" });
        try {
            const decoded = fastify.jwt.verify(token);
            return reply.send({ valid: true, decoded });
        }
        catch (err) {
            return reply.status(401).send({ valid: false, error: err.message });
        }
    });
    // Logout (revoke all refresh tokens for user)
    fastify.post("/auth/logout", async (req, reply) => {
        // expects Authorization: Bearer <accessToken>
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader)
                return reply.status(401).send({ error: "missing auth" });
            const token = authHeader.split(" ")[1];
            const payload = fastify.jwt.verify(token);
            await auth.revokeAllForUser(payload.sub);
            return reply.send({ ok: true });
        }
        catch (err) {
            return reply.status(401).send({ error: err.message });
        }
    });
    // Setting up 2FA and generating a QR code
    fastify.post("/auth/2fa/enable", async (req, reply) => {
        /*try {
            const authHeader = req.headers.authorization as string;
            if (!authHeader) return reply.status(401).send({ error: "missing auth" });
            const token = authHeader.split(" ")[1];
            const payload: any = fastify.jwt.verify(token);
    
            const result = await auth.enable2FA(payload.sub, payload.username);
            // return a QR-code for scanning in the Authenticator app
            return reply.send(result);
        } catch (err: any) {
            return reply.status(400).send({ error: err.message });
        }*/
        const gw = req.headers['x-gateway-secret'];
        if (!gw || gw !== process.env.GATEWAY_SECRET)
            return reply.status(401).send({ error: "missing auth" });
        const userId = Number(req.headers['x-user-id']);
        const username = String(req.headers['x-username'] || "");
        const result = await auth.enable2FA(userId, username);
        return reply.send(result);
    });
    // Verify 2FA token
    fastify.post("/auth/2fa/verify", async (req, reply) => {
        const { userId, token } = req.body;
        if (!userId || !token)
            return reply.status(400).send({ error: "userId and token required" });
        try {
            const isValid = await auth.verify2FA(userId, token);
            if (!isValid)
                return reply.status(401).send({ error: "Invalid 2FA token" });
            // for valid token respond JWT and refresh token
            const user = await auth.findUserById(userId);
            if (!user)
                return reply.status(404).send({ error: "User not found" });
            const accessToken = fastify.jwt.sign({ sub: user.id, username: user.username }, { expiresIn: "15m" });
            const { refreshToken, expiresAt } = await auth.createRefreshToken(user.id);
            return reply.send({
                accessToken,
                refreshToken,
                refreshExpiresAt: expiresAt,
            });
        }
        catch (err) {
            return reply.status(500).send({ error: err.message });
        }
    });
}
