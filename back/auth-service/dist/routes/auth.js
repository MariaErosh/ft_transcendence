"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const authService_1 = require("../services/authService");
async function authRoutes(fastify) {
    const auth = new authService_1.AuthService();
    // Registration
    fastify.post("/auth/register", async (req, reply) => {
        const { username, password, email } = req.body;
        try {
            //create record in AuthService
            //todo: update two_factor_auth = true
            const user = await auth.createUser(username, password, false);
            if (!user || !user.id)
                throw new Error("User creation failed");
            const systemToken = fastify.jwt.sign({ service: "auth", sub: user.id }, { expiresIn: "1m" });
            //create record in UserSrvice
            const response = await fetch("http://localhost:3002/users", {
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
            if (!response.ok) {
                await auth.deleteUser(user.id);
                const text = await response.text();
                return reply.status(500).send({ error: `UserService error: ${text}` });
            }
            const prof = await response.json();
            reply.code(201).send({
                auth_user: user,
                profile: prof
            });
        }
        catch (err) {
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
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader)
                return reply.status(401).send({ error: "missing auth" });
            const token = authHeader.split(" ")[1];
            const payload = fastify.jwt.verify(token);
            const result = await auth.enable2FA(payload.sub, payload.username);
            // return a QR-code for scanning in the Authenticator app
            return reply.send(result);
        }
        catch (err) {
            return reply.status(400).send({ error: err.message });
        }
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
