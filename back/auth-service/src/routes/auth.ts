import { FastifyInstance } from "fastify";
import { AuthService } from "../services/authService";
import { AuthUser } from "../services/authService";
import { requiredEnv } from "../index.js";

const USER_URL = requiredEnv("USER_SERVICE") + ":" + requiredEnv("USER_PORT");
const GATEWAY_SECRET = requiredEnv("GATEWAY_SECRET");

export async function authRoutes(fastify: FastifyInstance) {
	const auth = new AuthService();

	// Registration
	fastify.post("/auth/register", async (req, reply) => {
		const { username, password, tfa, email } = req.body as { username: string; password: string; tfa: boolean, email: string };
		let user: AuthUser | null = null;

		req.log.info({ username }, "Auth-service: Login request");
		//function to rollback a created user in auth-service
		const rollbackAuthUser = async () => {
			if (user?.id) {
				try {
					await auth.deleteUser(user.id);
					req.log.info(`Rollback: deleted Auth user ${user.id}`);
				} catch (err) {
					req.log.error({ err }, `Rollback failed for Auth user ${user.id}`);
				}
			}
		};

		try {
			//create record in AuthService
			//todo: update two_factor_auth = true
			user = await auth.createUser(username, email, password, tfa);
			req.log.info({ user }, "create user");
			if (!user || !user.id) throw new Error("User creation failed");
			const systemToken = fastify.jwt.sign(
				{ service: "auth", sub: user.id },
				{ expiresIn: "1m" });


			//create record in UserSrvice
			//console.log("sending to UserService:", { auth_user_id: user.id, username, email, token: systemToken });
			let response: Response;
			try {
				//response = await fetch(`${GATEWAY_URL}/users`, {
				response = await fetch(`${USER_URL}/users`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						//"Authorization": `Bearer ${systemToken}`
						"x-gateway-secret": GATEWAY_SECRET, // чтобы user-service пропустил
						"x-user-service": "auth",
						"x-user-id": user.id.toString()
					},
					body: JSON.stringify({
						auth_user_id: user.id,
						username: username,
						email: email
					}),
				});
			} catch (userServErr) {
				await rollbackAuthUser();
				throw new Error(`Failed to contact UserService: ${(userServErr as Error).message}`);

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


		} catch (err: any) {
			await rollbackAuthUser();
			reply.status(400).send({ error: err.message });
		}
	});

	// Login
	fastify.post("/auth/login", async (req, reply) => {
		const { username, password } = req.body as {
			username: string; // it may be username or email
			password: string;
		};
		if (!username|| !password) return reply.status(400).send({ error: "username or email and password required" });
		try {
			const user = await auth.findUserByIdentifier(username);
			if (!user) return reply.status(401).send({ error: "invalid credentials" });

			const valid = await auth.validatePassword(password, user.password_hash);
			if (!valid) return reply.status(401).send({ error: "invalid credentials" });
			console.log("User fetched in login: ", user);

			if (user.two_factor_enabled && user.two_factor_secret && user.two_factor_set) {
				return reply.send({ twoFactorRequired: true, userId: user.id });
			}
			const accessToken = fastify.jwt.sign({ sub: user.id, username: user.username }, { expiresIn: "15m" });
			const { refreshToken, expiresAt } = await auth.createRefreshToken(user.id);

			if (user.two_factor_enabled && !user.two_factor_secret) {
				return reply.send({
					status: "onboarding_2fa",
					userId: user.id,
					accessToken,
					refreshToken,
					refreshExpiresAt: expiresAt,
				});
			}

			if (user.two_factor_enabled && user.two_factor_secret && !user.two_factor_set) {
				auth.delete2FAsecret(user.id)
				return reply.send({
					status: "onboarding_2fa",
					userId: user.id,
					accessToken,
					refreshToken,
					refreshExpiresAt: expiresAt,
				});
			}

			return reply.send({
				username: user.username,
				accessToken,
				refreshToken,
				refreshExpiresAt: expiresAt,
			});
		} catch (err: any) {
			return reply.status(500).send({ error: "Internal server error" })
		}
	});


	// Token refresh
	fastify.post("/auth/refresh", async (req, reply) => {
		const { refreshToken } = req.body as any;
		try {
			const userId = await auth.consumeRefreshToken(refreshToken);
			const user = await auth.findUserById(userId);
			if (!user) {
				return reply.status(401).send({ error: "User not found" });
			}
			const accessToken = fastify.jwt.sign(
				{ sub: user.id, username: user.username },
				{ expiresIn: "15m" }
			);
			const { refreshToken: newRefresh, expiresAt } = await auth.createRefreshToken(userId);
			reply.send({ accessToken, refreshToken: newRefresh, refreshExpiresAt: expiresAt });
		} catch (err: any) {
			reply.status(401).send({ error: err.message });
		}
	});

	// Verify token
	fastify.post("/auth/verify", async (req, reply) => {
		const { token } = req.body as any;
		if (!token) return reply.status(400).send({ error: "Token required" });
		try {
			const decoded = fastify.jwt.verify(token);
			return reply.send({ valid: true, decoded });
		} catch (err: any) {
			return reply.status(401).send({ valid: false, error: err.message });
		}
	}
	);

	// Logout (revoke all refresh tokens for user)
	fastify.post("/auth/logout", async (req, reply) => {
		// expects Authorization: Bearer <accessToken>
		try {
			const authHeader = req.headers.authorization as string | undefined;
			if (!authHeader) return reply.status(401).send({ error: "missing auth" });
			const token = authHeader.split(" ")[1];
			const payload: any = fastify.jwt.verify(token);
			await auth.revokeAllForUser(payload.sub);
			return reply.send({ ok: true });
		} catch (err: any) {
			return reply.status(401).send({ error: err.message });
		}
	});

	// Setting up 2FA and generating a QR code
	fastify.post("/auth/2fa/enable", async (req, reply) => {
		let userId: number;
		let username: string;

		// Check if called from gateway
		const gw = (req.headers as any)['x-gateway-secret'];
		if (gw && gw === GATEWAY_SECRET) {
			// Gateway call - use headers
			userId = Number((req.headers as any)['x-user-id']);
			username = String((req.headers as any)['x-username'] || "");
		} else {
			// Direct call - use JWT authentication
			try {
				const authHeader = req.headers.authorization as string | undefined;
				if (!authHeader) return reply.status(401).send({ error: "Missing authentication" });
				const token = authHeader.split(" ")[1];
				const payload: any = fastify.jwt.verify(token);
				userId = payload.sub;
				username = payload.username;
			} catch (err: any) {
				return reply.status(401).send({ error: "Invalid token" });
			}
		}

		if (!userId) return reply.status(400).send({ error: "User ID missing" });

		try {
			const result = await auth.enable2FA(userId, username);
			return reply.send(result);
		} catch (err: any) {
			return reply.status(400).send({ error: err.message });
		}
	});

	fastify.post("/auth/2fa/deletesecret", async (req, reply) => {

		const gw = (req.headers as any)['x-gateway-secret'];
		if (!gw || gw !== GATEWAY_SECRET) return reply.status(401).send({ error: "access not from Gateway" });

		const userId = Number((req.headers as any)['x-user-id']);
		if (!userId) return reply.status(400).send({ error: "User ID missing from headers" });

		try {
			const result = await auth.delete2FAsecret(userId);
			return reply.send(result);
		} catch (err: any) {
			return reply.status(400).send({ error: err.message });
		}
	});

	fastify.post("/auth/2fa/set", async (req, reply) => {
		let userId: number;

		// Check if called from gateway
		const gw = (req.headers as any)['x-gateway-secret'];
		if (gw && gw === GATEWAY_SECRET) {
			// Gateway call - use headers
			userId = Number((req.headers as any)['x-user-id']);
		} else {
			// Direct call - use JWT authentication
			try {
				const authHeader = req.headers.authorization as string | undefined;
				if (!authHeader) return reply.status(401).send({ error: "Missing authentication" });
				const token = authHeader.split(" ")[1];
				const payload: any = fastify.jwt.verify(token);
				userId = payload.sub;
			} catch (err: any) {
				return reply.status(401).send({ error: "Invalid token" });
			}
		}

		if (!userId) return reply.status(400).send({ error: "User ID missing" });

		try {
			const result = await auth.mark2FAset(userId);
			return reply.status(201).send(result);
		} catch (err: any) {
			return reply.status(400).send({ error: err.message });
		}
	});

	// Verify 2FA token
	fastify.post("/auth/2fa/verify", async (req, reply) => {
		const { userId, token } = req.body as { userId: number; token: string };
		if (!userId || !token) return reply.status(400).send({ error: "userId and token required" });

		try {
			const isValid = await auth.verify2FA(userId, token);
			if (!isValid) return reply.status(401).send({ error: "Invalid 2FA token" });

			// for valid token respond JWT and refresh token
			const user = await auth.findUserById(userId);
			if (!user) return reply.status(404).send({ error: "User not found" });

			const accessToken = fastify.jwt.sign(
				{ sub: user.id, username: user.username },
				{ expiresIn: "15m" }
			);
			const { refreshToken, expiresAt } = await auth.createRefreshToken(user.id);

			return reply.send({
				accessToken,
				refreshToken,
				refreshExpiresAt: expiresAt,
				userName: user.username
			});
		} catch (err: any) {
			return reply.status(500).send({ error: err.message });
		}
	});




}
