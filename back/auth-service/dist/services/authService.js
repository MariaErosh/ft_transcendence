"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const database_1 = require("../db/database");
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = require("crypto");
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
class AuthService {
    async createUser(username, password, two_factor_enabled) {
        const hash = await bcrypt_1.default.hash(password, 10);
        return new Promise((resolve, reject) => {
            database_1.db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, hash], function (err) {
                if (err)
                    return reject(err);
                resolve({ id: this.lastID, username, two_factor_enabled });
            });
        });
    }
    async findUserByUsername(username) {
        return new Promise((resolve, reject) => {
            database_1.db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
                if (err)
                    return reject(err);
                resolve(row ?? undefined);
            });
        });
    }
    async findUserById(userId) {
        return new Promise((resolve, reject) => {
            database_1.db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
                if (err)
                    return reject(err);
                resolve(row ?? undefined);
            });
        });
    }
    async validatePassword(password, passwordHash) {
        return bcrypt_1.default.compare(password, passwordHash);
    }
    async createRefreshToken(userId, ttlSeconds = 60 * 60 * 24 * 30) {
        const raw = (0, crypto_1.randomUUID)();
        const hash = await bcrypt_1.default.hash(raw, 10);
        const days = Math.floor(ttlSeconds / (60 * 60 * 24));
        return new Promise((resolve, reject) => {
            const days = Math.floor(ttlSeconds / (60 * 60 * 24));
            database_1.db.run("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+' || ? || ' days'))", [userId, hash, days], function (err) {
                if (err)
                    return reject(err);
                // fetch expires_at back from the db (to avoid rounding difference)
                database_1.db.get("SELECT expires_at FROM refresh_tokens WHERE id = ?", [this.lastID], (err2, row) => {
                    if (err2)
                        return reject(err2);
                    resolve({ refreshToken: raw, expiresAt: row.expires_at });
                });
            });
        });
    }
    async consumeRefreshToken(rawToken) {
        return new Promise((resolve, reject) => {
            database_1.db.all("SELECT * FROM refresh_tokens", [], async (err, rows) => {
                if (err)
                    return reject(err);
                if (!rows || rows.length === 0) {
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
                    const match = await bcrypt_1.default.compare(rawToken, r.token_hash);
                    if (match) {
                        //check expiration
                        if (r.expires_at && new Date(r.expires_at) < new Date()) {
                            database_1.db.run("DELETE FROM refresh_tokens WHERE id = ?", [r.id]);
                            return reject(new Error("Refresh token expired"));
                        }
                        database_1.db.run("DELETE FROM refresh_tokens WHERE id = ?", [r.id]);
                        return resolve(r.user_id);
                    }
                }
                reject(new Error("Refresh token not found"));
            });
        });
    }
    async revokeAllForUser(userId) {
        return new Promise((resolve, reject) => {
            database_1.db.run("DELETE FROM refresh_tokens WHERE user_id = ?", [userId], err => {
                if (err)
                    return reject(err);
                resolve(true);
            });
        });
    }
    // enable 2FA (TOTP)
    async enable2FA(userId, username) {
        const secret = otplib_1.authenticator.generateSecret();
        return new Promise((resolve, reject) => {
            database_1.db.run("UPDATE users SET two_factor_enabled = 1, two_factor_secret = ? WHERE id = ?", [secret, userId], async (err) => {
                if (err)
                    return reject(err);
                const otpauth = otplib_1.authenticator.keyuri(username, "FT_Transcendence", secret);
                const qrCodeDataURL = await qrcode_1.default.toDataURL(otpauth);
                resolve({ secret, qrCodeDataURL });
            });
        });
    }
    // verifying the TOTP code on login
    async verify2FA(userId, token) {
        return new Promise((resolve, reject) => {
            database_1.db.get("SELECT two_factor_secret FROM users WHERE id = ?", [userId], (err, row) => {
                if (err)
                    return reject(err);
                if (!row || !row.two_factor_secret)
                    return resolve(false);
                const isValid = otplib_1.authenticator.check(token, row.two_factor_secret);
                resolve(isValid);
            });
        });
    }
    async deleteUser(userId) {
        return new Promise((resolve, reject) => {
            database_1.db.run("DELETE FROM refresh_tokens WHERE user_id = ?", [userId], err => {
                if (err) {
                    return reject(err);
                }
                database_1.db.run("DELETE FROM users WHERE id = ?", [userId], function (err2) {
                    if (err2) {
                        return reject(err2);
                    }
                    resolve(this.changes > 0); // true, if deleted
                });
            });
        });
    }
}
exports.AuthService = AuthService;
