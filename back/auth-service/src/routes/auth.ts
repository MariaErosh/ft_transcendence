import { FastifyInstance } from "fastify";
import { AuthService } from "../services/authService";
import { AuthUser } from "../services/authService";
import dotenv from "dotenv";

dotenv.config();

const GATEWAY_URL = process.env.GATEWAY_URL;

export async function authRoutes(fastify: FastifyInstance) {
  const auth = new AuthService();

  	// Registration
	fastify.post("/auth/register", async (req, reply) => {
		const { username, password, email } = req.body as { username: string; password: string; email: string };
		let user: AuthUser | null = null;

		//function to rollback a created user in auth-service
		const rollbackAuthUser = async () => {
			if (user?.id) {
				try {
					await auth.deleteUser(user.id);
					console.log(`Rollback: deleted Auth user ${user.id}`);
				} catch (err) {
					console.error(`Rollback failed for Auth user ${user.id}:`, err);
				}
			}
		};

		try {
			//create record in AuthService
			//todo: update two_factor_auth = true
			user = await auth.createUser(username, password, false );
			if (!user || !user.id) throw new Error ("User creation failed");

			const systemToken = fastify.jwt.sign(
					{ service: "auth", sub: user.id },
      				{ expiresIn: "1m" } );


			//create record in UserSrvice
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
			username: string;
			password: string;
		};
		if (!username || !password) return reply.status(400).send({ error: "username and password required" });
		try {
			const user = await auth.findUserByUsername(username);
			if (!user) return reply.status(401).send({ error: "invalid credentials" });

			const valid = await auth.validatePassword(password, user.password_hash);
			if (!valid) return reply.status(401).send({ error: "invalid credentials" });

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
		} catch (err: any) {
			return reply.status(500).send({ error: "Internal server error"})
		}
	});
		

	// Token refresh
	fastify.post("/auth/refresh", async (req, reply) => {
		const { refreshToken } = req.body as any;
		try {
			const userId = await auth.consumeRefreshToken(refreshToken);
			const accessToken = fastify.jwt.sign({ sub: userId }, { expiresIn: "15m" });
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
	if (!gw || gw !== process.env.GATEWAY_SECRET) return reply.status(401).send({ error: "missing auth" });

	const userId = Number((req.headers as any)['x-user-id']);
	const username = String((req.headers as any)['x-username'] || "");
	const result = await auth.enable2FA(userId, username);
	return reply.send(result);
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
		});
	} catch (err: any) {
		return reply.status(500).send({ error: err.message });
	}
	});




}
