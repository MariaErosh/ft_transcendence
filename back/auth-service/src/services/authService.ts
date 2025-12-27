import { db } from "../db/database";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import pino from "pino";

const logger = pino({
	level: 'info',
	transport: {
		targets: [
			{ target: 'pino/file', options: { destination: 1 } },
			{
				target: 'pino-socket',
				options: { address: 'logstash', port: 5000, mode: 'tcp', reconnect: true }
			}
		]
	}
});


interface RefreshTokenRow {
	id: number;
	user_id: number;
	token_hash: string;
	expires_at: string | null;
	created_at: string;
}

export interface UserRow {
	id: number;
	username: string;
	created_at: string;
	two_factor_secret: string | null;
	two_factor_enabled: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
  two_factor_enabled: boolean;
}

function isValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export class AuthService {

	async createUser(username: string, email: string, password: string, two_factor_enabled: boolean): Promise<AuthUser> {
		const hash = await bcrypt.hash(password, 10);
		return new Promise((resolve, reject) => {
		db.run(
			"INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
			[username, email, hash],
			function (err) {
				if (err) {
					logger.error({ err }, "Failed to create user");
					return reject(err);
				}
				logger.info({ userId: this.lastID, username }, "User created successfully");
				resolve({ id: this.lastID, username, two_factor_enabled });
			}
		);
		});
	}

	async findUserByUsername(username: string): Promise<any> {
		return new Promise((resolve, reject) => {
		db.get<UserRow>("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
			if (err) {
				logger.error({ err, username }, "Error finding user by username");
				return reject(err);
			}
			resolve(row ?? undefined);
		});
		});
	}

	async findUserById(userId: number): Promise<UserRow | undefined> {
		return new Promise((resolve, reject) => {
		db.get<UserRow>("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
			if (err) {
				logger.error({ err, userId }, "Error finding user by ID");
				return reject(err);
			}
			resolve(row ?? undefined);
		});
		});
	}

	async findUserByIdentifier(identifier: string): Promise<UserRow | undefined> {
		return new Promise((resolve, reject) => {
			const query = isValidEmail(identifier)	? "SELECT * FROM users WHERE email = ?"
													: "SELECT * FROM users WHERE username = ?";
			db.get<UserRow>(query, [identifier], (err, row) => {
				if (err) return reject(err);
				resolve(row ?? undefined);
			});
		});
	}

	async validatePassword(password: string, passwordHash: string) {
		return bcrypt.compare(password, passwordHash);
	}

	async createRefreshToken(userId: number, ttlSeconds = 60 * 60 * 24 *30) { // 30 days
		const raw = randomUUID();
		const hash = await bcrypt.hash(raw, 10);
		const days = Math.floor(ttlSeconds / (60 * 60 * 24));

		return new Promise<{ refreshToken: string; expiresAt: string }>((resolve, reject) => {
			const days = Math.floor(ttlSeconds / (60 * 60 * 24));
			db.run(
				"INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+' || ? || ' days'))",
				[userId, hash, days],
				function (err) {
					if (err) {
						logger.error({ err }, "Failed to insert refresh token");
						return reject(err);
					}

					// fetch expires_at back from the db (to avoid rounding difference)
					db.get<{ expires_at: string }>(
						"SELECT expires_at FROM refresh_tokens WHERE id = ?",
						[this.lastID],
						(err2, row) => {
							if (err2) {
								logger.error({ err: err2 }, "Failed to fetch created refresh token");
								return reject(err2);
							}
							resolve({ refreshToken: raw, expiresAt: row!.expires_at });
						}
					);
				}
			);
		});
	}


	async consumeRefreshToken(rawToken: string): Promise<number> {
		return new Promise<number>((resolve, reject) => {
		db.all<RefreshTokenRow>("SELECT * FROM refresh_tokens", [], async (err, rows: any[]) => {
			if (err) {
				logger.error({ err }, "Database error finding refresh tokens");
				return reject(err);
			}
			if (!rows || rows.length === 0) {
				return reject(new Error("No refresh tokens found"));
			}


			for (const r of rows) {
			const match = await bcrypt.compare(rawToken, r.token_hash);
			if (match) {
				//check expiration
				if (r.expires_at && new Date(r.expires_at) < new Date()) {
				db.run("DELETE FROM refresh_tokens WHERE id = ?", [r.id]);
				logger.warn({ userId: r.user_id }, "Refresh token expired");
				return reject(new Error("Refresh token expired"));
				}
				db.run("DELETE FROM refresh_tokens WHERE id = ?", [r.id]);
				return resolve(r.user_id);
			}
			}
			logger.warn("Refresh token not found or invalid");
			reject(new Error("Refresh token not found"));
		});
		});
	}

	async revokeAllForUser(userId: number) {
		return new Promise((resolve, reject) => {
		db.run("DELETE FROM refresh_tokens WHERE user_id = ?", [userId], err => {
			if (err) {
				logger.error({ err, userId }, "Failed to revoke tokens");
				return reject(err);
			}
			resolve(true);
		});
		});
	}

  // enable 2FA (TOTP)
	async enable2FA(userId: number, username: string) {
		const secret = authenticator.generateSecret();
		return new Promise<{ secret: string; qrCodeDataURL: string }>((resolve, reject) => {
		db.run(
			"UPDATE users SET two_factor_enabled = 1, two_factor_secret = ? WHERE id = ?",
			[secret, userId],
			async err => {
			if (err) {
				logger.error({ err, userId }, "Failed to enable 2FA");
				return reject(err);
			}
			const otpauth = authenticator.keyuri(username, "FT_Transcendence", secret);
			const qrCodeDataURL = await QRCode.toDataURL(otpauth);
			resolve({ secret, qrCodeDataURL });
			}
		);
		});
	}
	// verifying the TOTP code on login
	async verify2FA(userId: number, token: string): Promise<boolean> {
		return new Promise((resolve, reject) => {
		db.get<UserRow>(
			"SELECT two_factor_secret FROM users WHERE id = ?",
			[userId],
			(err, row) => {
			if (err) {
				logger.error({ err, userId }, "Error verifying 2FA");
				return reject(err);
			}
			if (!row || !row.two_factor_secret) return resolve(false);
			const isValid = authenticator.check(token, row.two_factor_secret);
			resolve(isValid);
			}
		);
		});
	}


async deleteUser(userId: number): Promise<boolean> {
	return new Promise((resolve, reject) => {
		db.run("DELETE FROM refresh_tokens WHERE user_id = ?", [userId], err => {
			if (err) {
				logger.error({ err, userId }, "Failed to delete refresh tokens for user");
				return reject(err);
			}

			db.run("DELETE FROM users WHERE id = ?", [userId], function (err2) {
			if (err2) {
				logger.error({ err: err2, userId }, "Failed to delete user");
				return reject(err2);
			}
			logger.info({ userId, deleted: this.changes > 0 }, "User deleted");
			resolve(this.changes > 0); // true, if deleted
			});
		});
	});
}


}
