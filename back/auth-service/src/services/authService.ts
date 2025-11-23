import { db } from "../db/database";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import logger from "../../../../observability/dist/log/logger"; // Import logger
import { dbErrors, dbQueryDuration } from "../../../../observability/dist/metrics/metrics"; // Import metrics


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

export class AuthService {

    async createUser(username: string, password: string, two_factor_enabled: boolean): Promise<AuthUser> {
        const hash = await bcrypt.hash(password, 10);
        const start = Date.now(); // Start timer for monitoring
        return new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            [username, hash],
            function (err) {
                const duration = (Date.now() - start) / 1000; // Calculate duration
                dbQueryDuration.labels("create_user", process.env.SERVICE_NAME).observe(duration); // Record query duration
                if (err) {
                    logger.error("Failed to create user", { username, error: err.message }); // Log error
                    dbErrors.labels("create_user", process.env.SERVICE_NAME).inc(); // Increment error counter
                    return reject(err);
                }
                logger.info("User created successfully", { userId: this.lastID, username }); // Log success
                resolve({ id: this.lastID, username, two_factor_enabled });
            }
        );
        });
    }

    async findUserByUsername(username: string): Promise<any> {
        const start = Date.now(); // Start timer for monitoring
        return new Promise((resolve, reject) => {
        db.get<UserRow>("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
            const duration = (Date.now() - start) / 1000; // Calculate duration
            dbQueryDuration.labels("find_user_by_username", process.env.SERVICE_NAME).observe(duration); // Record query duration
            if (err) {
                logger.error("Failed to find user by username", { username, error: err.message }); // Log error
                dbErrors.labels("find_user_by_username", process.env.SERVICE_NAME).inc(); // Increment error counter
                return reject(err);
            }
            if (!row) {
                logger.warn("User not found by username", { username }); // Log warning
            } else {
                logger.info("User found by username", { username }); // Log success
            }
            resolve(row ?? undefined);
        });
        });
    }

    async findUserById(userId: number): Promise<UserRow | undefined> {
        const start = Date.now(); // Start timer for monitoring
        return new Promise((resolve, reject) => {
        db.get<UserRow>("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
            const duration = (Date.now() - start) / 1000; // Calculate duration
            dbQueryDuration.labels("find_user_by_id", process.env.SERVICE_NAME).observe(duration); // Record query duration
            if (err) {
                logger.error("Failed to find user by ID", { userId, error: err.message }); // Log error
                dbErrors.labels("find_user_by_id", process.env.SERVICE_NAME).inc(); // Increment error counter
                return reject(err);
            }
            if (!row) {
                logger.warn("User not found by ID", { userId }); // Log warning
            } else {
                logger.info("User found by ID", { userId }); // Log success
            }
            resolve(row ?? undefined);
        });
        });
    }

    async validatePassword(password: string, passwordHash: string) {
        logger.info("Validating password"); // Log validation attempt
        return bcrypt.compare(password, passwordHash);
    }

    async createRefreshToken(userId: number, ttlSeconds = 60 * 60 * 24 *30) { // 30 days
        const raw = randomUUID();
        const hash = await bcrypt.hash(raw, 10);
        const days = Math.floor(ttlSeconds / (60 * 60 * 24));
        const start = Date.now(); // Start timer for monitoring

        return new Promise<{ refreshToken: string; expiresAt: string }>((resolve, reject) => {
            const days = Math.floor(ttlSeconds / (60 * 60 * 24));
            db.run(
                "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+' || ? || ' days'))",
                [userId, hash, days],
                function (err) {
                    const duration = (Date.now() - start) / 1000; // Calculate duration
                    dbQueryDuration.labels("create_refresh_token", process.env.SERVICE_NAME).observe(duration); // Record query duration
                    if (err) {
                        logger.error("Failed to create refresh token", { userId, error: err.message }); // Log error
                        dbErrors.labels("create_refresh_token", process.env.SERVICE_NAME).inc(); // Increment error counter
                        return reject(err);
                    }

                    // fetch expires_at back from the db (to avoid rounding difference)
                    db.get<{ expires_at: string }>(
                        "SELECT expires_at FROM refresh_tokens WHERE id = ?",
                        [this.lastID],
                        (err2, row) => {
                            if (err2) {
                                logger.error("Failed to fetch refresh token expiration", { userId, error: err2.message }); // Log error
                                dbErrors.labels("fetch_refresh_token_expiration", process.env.SERVICE_NAME).inc(); // Increment error counter
                                return reject(err2);
                            }
                            logger.info("Refresh token created successfully", { userId }); // Log success
                            resolve({ refreshToken: raw, expiresAt: row!.expires_at });
                        }
                    );
                }
            );
        });
    }


    async consumeRefreshToken(rawToken: string): Promise<number> {
        const start = Date.now(); // Start timer for monitoring
        return new Promise<number>((resolve, reject) => {
        db.all<RefreshTokenRow>("SELECT * FROM refresh_tokens", [], async (err, rows: any[]) => {
            const duration = (Date.now() - start) / 1000; // Calculate duration
            if (err) {
                logger.error("Failed to consume refresh token", { error: err.message }); // Log error
                dbErrors.labels("consume_refresh_token", process.env.SERVICE_NAME).inc(); // Increment error counter
                dbQueryDuration.labels("consume_refresh_token", process.env.SERVICE_NAME).observe(duration); // Record query duration
                return reject(err);
            }
            if (!rows || rows.length === 0) {
                logger.warn("No refresh tokens found"); // Log warning
                dbErrors.labels("consume_refresh_token", process.env.SERVICE_NAME).inc(); // Increment error counter
                return reject(new Error("No refresh tokens found"));
            }

            //casting to type RefreshTokenRow
            /*const tokenRows: RefreshTokenRow[] = rows.map(row => ({
                id: row.id,
                user_id: row.user_id,
                token_hash: row.token_hash,
                expires_at: row.expires_at,
                created_at: row.created_at
            }));*/

            for (const r of rows) {
            const match = await bcrypt.compare(rawToken, r.token_hash);
            if (match) {
                //check expiration
                if (r.expires_at && new Date(r.expires_at) < new Date()) {
                    db.run("DELETE FROM refresh_tokens WHERE id = ?", [r.id]);
                    logger.warn("Refresh token expired", { userId: r.user_id }); // Log expiration
                    dbErrors.labels("refresh_token_expired", process.env.SERVICE_NAME).inc(); // Increment error counter
                    return reject(new Error("Refresh token expired"));
                }
                db.run("DELETE FROM refresh_tokens WHERE id = ?", [r.id]);
                dbQueryDuration.labels("consume_refresh_token", process.env.SERVICE_NAME).observe(duration); // Record query duration
                logger.info("Refresh token consumed successfully", { userId: r.user_id }); // Log success
                return resolve(r.user_id);
            }
            }
            logger.warn("Refresh token not found"); // Log warning
            dbErrors.labels("refresh_token_not_found", process.env.SERVICE_NAME).inc(); // Increment error counter
            reject(new Error("Refresh token not found"));
        });
        });
    }

    async revokeAllForUser(userId: number) {
        const start = Date.now(); // Start timer for monitoring
        return new Promise((resolve, reject) => {
        db.run("DELETE FROM refresh_tokens WHERE user_id = ?", [userId], (err) => {
            const duration = (Date.now() - start) / 1000; // Calculate duration
            if (err) {
                logger.error("Failed to revoke refresh tokens", { userId, error: err.message }); // Log error
                dbErrors.labels("revoke_refresh_tokens", process.env.SERVICE_NAME).inc(); // Increment error counter
                return reject(err);
            }
            dbQueryDuration.labels("revoke_refresh_tokens", process.env.SERVICE_NAME).observe(duration); // Record query duration
            logger.info("All refresh tokens revoked for user", { userId }); // Log success
            resolve(true);
        });
        });
    }

  // enable 2FA (TOTP)
    async enable2FA(userId: number, username: string) {
        const secret = authenticator.generateSecret();
        logger.info("Enabling 2FA for user", { userId, username }); // Log 2FA enable
        return new Promise<{ secret: string; qrCodeDataURL: string }>((resolve, reject) => {
        db.run(
            "UPDATE users SET two_factor_enabled = 1, two_factor_secret = ? WHERE id = ?",
            [secret, userId],
            async err => {
            if (err) {
                logger.error("Failed to enable 2FA", { userId, error: err.message }); // Log error
                dbErrors.labels("enable_2fa", process.env.SERVICE_NAME).inc(); // Increment error counter
                return reject(err);
            }
            try {
                const otpauth = authenticator.keyuri(username, "FT_Transcendence", secret);
                const qrCodeDataURL = await QRCode.toDataURL(otpauth);
                logger.info("2FA QR code generated successfully", { userId }); // Log success
                resolve({ secret, qrCodeDataURL });
            } catch (qrErr) {
                logger.error("Failed to generate 2FA QR code", { userId, error: qrErr }); // Log error
                reject(qrErr);
            }
            }
        );
        });
    }

    // verifying the TOTP code on login
    async verify2FA(userId: number, token: string): Promise<boolean> {
        const start = Date.now(); // Start timer for monitoring
        return new Promise((resolve, reject) => {
        db.get<UserRow>(
            "SELECT two_factor_secret FROM users WHERE id = ?",
            [userId],
            (err, row) => {
                const duration = (Date.now() - start) / 1000; // Calculate duration
                if (err) {
                    logger.error("Failed to verify 2FA", { userId, error: err.message }); // Log error
                    dbErrors.labels("verify_2fa", process.env.SERVICE_NAME).inc(); // Increment error counter
                    dbQueryDuration.labels("verify_2fa", process.env.SERVICE_NAME).observe(duration); // Record query duration
                    return reject(err);
                }
                if (!row || !row.two_factor_secret) {
                    logger.warn("2FA secret not found for user", { userId }); // Log warning
                    dbQueryDuration.labels("verify_2fa", process.env.SERVICE_NAME).observe(duration); // Record query duration
                    return resolve(false);
                }
                const isValid = authenticator.check(token, row.two_factor_secret);
                dbQueryDuration.labels("verify_2fa", process.env.SERVICE_NAME).observe(duration); // Record query duration
                if (isValid) {
                    logger.info("2FA token verified successfully", { userId }); // Log success
                } else {
                    logger.warn("Invalid 2FA token", { userId }); // Log invalid token
                }
                resolve(isValid);
            }
        );
        });
    }


    async deleteUser(userId: number): Promise<boolean> {
        const start = Date.now(); // Start timer for monitoring
        return new Promise((resolve, reject) => {
            db.run("DELETE FROM refresh_tokens WHERE user_id = ?", [userId], err => {
                if (err) {
                    logger.error("Failed to delete refresh tokens for user", { userId, error: err.message }); // Log error
                    dbErrors.labels("delete_user_tokens", process.env.SERVICE_NAME).inc(); // Increment error counter
                    return reject(err);
                }

                db.run("DELETE FROM users WHERE id = ?", [userId], function (err2) {
                    const duration = (Date.now() - start) / 1000; // Calculate duration
                    if (err2) {
                        logger.error("Failed to delete user", { userId, error: err2.message }); // Log error
                        dbErrors.labels("delete_user", process.env.SERVICE_NAME).inc(); // Increment error counter
                        dbQueryDuration.labels("delete_user", process.env.SERVICE_NAME).observe(duration); // Record query duration
                        return reject(err2);
                    }
                    dbQueryDuration.labels("delete_user", process.env.SERVICE_NAME).observe(duration); // Record query duration
                    logger.info("User deleted successfully", { userId, deletedRecords: this.changes }); // Log success
                    resolve(this.changes > 0); // true, if deleted
                });
            });
        });
    }


}
