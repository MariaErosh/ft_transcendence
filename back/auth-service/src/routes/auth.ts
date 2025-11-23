import { FastifyInstance } from "fastify";
import { AuthService } from "../services/authService";
import { AuthUser } from "../services/authService";
import dotenv from "dotenv";
import logger from "../../../../observability/dist/log/logger"; // Import logger
import { dbErrors, dbQueryDuration, authAttempts, jwtTokensIssued } from "../../../../observability/dist/metrics/metrics"; // Import metrics

dotenv.config();

const GATEWAY_URL = process.env.GATEWAY_URL;

export async function authRoutes(fastify: FastifyInstance) {
  const auth = new AuthService();

      // Registration
    fastify.post("/auth/register", async (req, reply) => {
        const { username, password, email } = req.body as { username: string; password: string; email: string };
        let user: AuthUser | null = null;

        console.log("Auth-service: Login request:", username);
        logger.info("Registration attempt", { username, email }); // Log registration attempt

        //function to rollback a created user in auth-service
        const rollbackAuthUser = async () => {
            if (user?.id) {
                try {
                    await auth.deleteUser(user.id);
                    logger.info(`Rollback: deleted Auth user ${user.id}`); // Log rollback
                    console.log(`Rollback: deleted Auth user ${user.id}`);
                } catch (err) {
                    logger.error(`Rollback failed for Auth user ${user.id}:`, { error: err });
                    console.error(`Rollback failed for Auth user ${user.id}:`, err);
                }
            }
        };

        try {
            const start = Date.now(); // Start timer for monitoring
            //create record in AuthService
            //todo: update two_factor_auth = true
            user = await auth.createUser(username, password, false );
            console.log("create user:", user);
            if (!user || !user.id) throw new Error ("User creation failed");

            const systemToken = fastify.jwt.sign(
                    { service: "auth", sub: user.id },
                      { expiresIn: "1m" } );
            jwtTokensIssued.labels(process.env.SERVICE_NAME).inc(); // Track token issued


            //create record in UserSrvice
            //console.log("sending to UserService:", { auth_user_id: user.id, username, email, token: systemToken });
            let response : Response;
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
            } catch (userServErr){
                await rollbackAuthUser();
                dbErrors.labels("user_service", process.env.SERVICE_NAME).inc(); // Increment error counter for UserService
                logger.error("Failed to contact UserService", { error: userServErr }); // Log error
                throw new Error(`Failed to contact UserService: ${(userServErr as Error).message}`);

            }

            if (!response.ok) {
                //await auth.deleteUser(user.id);
                const text = await response.text();
                await rollbackAuthUser();
                dbErrors.labels("user_service", process.env.SERVICE_NAME).inc(); // Increment error counter for UserService
                logger.error("UserService error", { status: response.status, details: text }); // Log error
                return reply.status(500).send({ error: `UserService error: ${text}` });
            }


            const prof = await response.json();
            const duration = (Date.now() - start) / 1000; // Calculate duration
            dbQueryDuration.labels("auth_register", process.env.SERVICE_NAME).observe(duration); // Record query duration

            logger.info("User registered successfully", { userId: user.id, username }); // Log success
            authAttempts.labels("success", process.env.SERVICE_NAME).inc(); // Track successful registration
            reply.code(201).send({
                auth_user: user,
                profile: prof
            });


        } catch (err: any) {
            await rollbackAuthUser();
            logger.error("Registration failed", { error: err.message }); // Log error
            authAttempts.labels("failed", process.env.SERVICE_NAME).inc(); // Track failed registration
            reply.status(400).send({ error: err.message });
        }
    });

    // Login
    fastify.post("/auth/login", async (req, reply) => {
        const { username, password } = req.body as {
            username: string;
            password: string;
        };

        logger.info("Login attempt", { username }); // Log login attempt

        if (!username || !password) {
            logger.warn("Login attempt with missing credentials"); // Log warning
            authAttempts.labels("failed", process.env.SERVICE_NAME).inc(); // Track failed attempt
            return reply.status(400).send({ error: "username and password required" });
        }
        try {
            const user = await auth.findUserByUsername(username);
            if (!user) {
                logger.warn("Invalid login attempt", { username }); // Log invalid attempt
                authAttempts.labels("failed", process.env.SERVICE_NAME).inc(); // Track failed attempt
                return reply.status(401).send({ error: "invalid credentials" });
            }

            const valid = await auth.validatePassword(password, user.password_hash);
            if (!valid) {
                logger.warn("Invalid password attempt", { username }); // Log invalid password
                authAttempts.labels("failed", process.env.SERVICE_NAME).inc(); // Track failed attempt
                return reply.status(401).send({ error: "invalid credentials" });
            }

            if (user.two_factor_enabled) {
                logger.info("Two-factor authentication required", { userId: user.id }); // Log 2FA requirement
                return reply.send({ twoFactorRequired: true, userId: user.id });
            }
            const accessToken = fastify.jwt.sign({ sub: user.id, username: user.username }, { expiresIn: "15m" });
            const { refreshToken, expiresAt } = await auth.createRefreshToken(user.id);
            jwtTokensIssued.labels(process.env.SERVICE_NAME).inc(); // Track token issued

            logger.info("User logged in successfully", { userId: user.id }); // Log success
            authAttempts.labels("success", process.env.SERVICE_NAME).inc(); // Track successful login
            return reply.send({
                accessToken,
                refreshToken,
                refreshExpiresAt: expiresAt,
            });
        } catch (err: any) {
            logger.error("Login failed", { error: err.message }); // Log error
            authAttempts.labels("failed", process.env.SERVICE_NAME).inc(); // Track failed attempt
            return reply.status(500).send({ error: "Internal server error"})
        }
    });


    // Token refresh
    fastify.post("/auth/refresh", async (req, reply) => {
        const { refreshToken } = req.body as any;

        logger.info("Token refresh attempt"); // Log refresh attempt

        try {
            const userId = await auth.consumeRefreshToken(refreshToken);
            const accessToken = fastify.jwt.sign({ sub: userId }, { expiresIn: "15m" });
            const { refreshToken: newRefresh, expiresAt } = await auth.createRefreshToken(userId);
            jwtTokensIssued.labels(process.env.SERVICE_NAME).inc(); // Track token issued

            logger.info("Token refreshed successfully", { userId }); // Log success
            reply.send({ accessToken, refreshToken: newRefresh, refreshExpiresAt: expiresAt });
        } catch (err: any) {
            logger.error("Token refresh failed", { error: err.message }); // Log error
            reply.status(401).send({ error: err.message });
        }
    });

    // Verify token
    fastify.post("/auth/verify", async (req, reply) => {
        const { token } = req.body as any;
        if (!token) {
            logger.warn("Token verification attempt with missing token"); // Log warning
            return reply.status(400).send({ error: "Token required" });
        }
        try {
            const decoded = fastify.jwt.verify(token);
            logger.info("Token verified successfully"); // Log success
            return reply.send({ valid: true, decoded });
        } catch (err: any) {
            logger.error("Token verification failed", { error: err.message }); // Log error
            return reply.status(401).send({ valid: false, error: err.message });
        }
    }
    );

    // Logout (revoke all refresh tokens for user)
    fastify.post("/auth/logout", async (req, reply) => {
        // expects Authorization: Bearer <accessToken>
        try {
        const authHeader = req.headers.authorization as string | undefined;
        if (!authHeader) {
            logger.warn("Logout attempt with missing auth header"); // Log warning
            return reply.status(401).send({ error: "missing auth" });
        }
        const token = authHeader.split(" ")[1];
        const payload: any = fastify.jwt.verify(token);
        await auth.revokeAllForUser(payload.sub);
        logger.info("User logged out successfully", { userId: payload.sub }); // Log success
        return reply.send({ ok: true });
        } catch (err: any) {
            logger.error("Logout failed", { error: err.message }); // Log error
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
    const gw = (req.headers as any)['x-gateway-secret'];
    if (!gw || gw !== process.env.GATEWAY_SECRET) {
        logger.warn("2FA enable attempt with invalid gateway secret"); // Log warning
        return reply.status(401).send({ error: "missing auth" });
    }

    const userId = Number((req.headers as any)['x-user-id']);
    const username = String((req.headers as any)['x-username'] || "");
    const result = await auth.enable2FA(userId, username);
    logger.info("2FA enabled", { userId, username }); // Log success
    return reply.send(result);
    });

    // Verify 2FA token
    fastify.post("/auth/2fa/verify", async (req, reply) => {
    const { userId, token } = req.body as { userId: number; token: string };
    if (!userId || !token) {
        logger.warn("2FA verification attempt with missing parameters", { userId }); // Log warning
        return reply.status(400).send({ error: "userId and token required" });
    }

    try {
        const isValid = await auth.verify2FA(userId, token);
        if (!isValid) {
            logger.warn("Invalid 2FA token", { userId }); // Log invalid token
            return reply.status(401).send({ error: "Invalid 2FA token" });
        }

        // for valid token respond JWT and refresh token
        const user = await auth.findUserById(userId);
        if (!user) {
            logger.error("User not found during 2FA verification", { userId }); // Log error
            return reply.status(404).send({ error: "User not found" });
        }

        const accessToken = fastify.jwt.sign(
            { sub: user.id, username: user.username },
            { expiresIn: "15m" }
        );
        const { refreshToken, expiresAt } = await auth.createRefreshToken(user.id);
        jwtTokensIssued.labels(process.env.SERVICE_NAME).inc(); // Track token issued

        logger.info("2FA verified successfully", { userId }); // Log success
        return reply.send({
            accessToken,
            refreshToken,
            refreshExpiresAt: expiresAt,
        });
    } catch (err: any) {
        logger.error("2FA verification failed", { error: err.message }); // Log error
        return reply.status(500).send({ error: err.message });
    }
    });
}
