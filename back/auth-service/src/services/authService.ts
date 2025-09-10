import { db } from "../db/database";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";


interface RefreshTokenRow {
	id: number;
	user_id: number;
	token_hash: string;
	expires_at: string | null;
	created_at: string;
}

interface UserRow {
	id: number;
	username: string;
	password_hash: string;
	created_at: string;
	two_factor_secret: string | null;
	two_factor_enabled: boolean;
}

export class AuthService {

  async createUser(username: string, password: string) {
    const hash = await bcrypt.hash(password, 10);
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        [username, hash],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, username });
        }
      );
    });
  }

  async findUserByUsername(username: string): Promise<any> {
    return new Promise((resolve, reject) => {
      db.get<UserRow>("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
        if (err) return reject(err);
        resolve(row ?? undefined);
      });
    });
  }

  async findUserById(userId: number): Promise<UserRow | undefined> {
    return new Promise((resolve, reject) => {
      db.get<UserRow>("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
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
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    return new Promise<{ refreshToken: string; expiresAt: string }>((resolve, reject) => {
      db.run(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        [userId, hash, expiresAt],
        function (err) {
          if (err) return reject(err);
          resolve({ refreshToken: raw, expiresAt });
        }
      );
    });
  }


  async consumeRefreshToken(rawToken: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      db.all<RefreshTokenRow>("SELECT * FROM refresh_tokens", [], async (err, rows: any[]) => {
        if (err) return reject(err);
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
          const match = await bcrypt.compare(rawToken, r.token_hash);
          if (match) {
			//check expiration
            if (r.expires_at && new Date(r.expires_at) < new Date()) {
              db.run("DELETE FROM refresh_tokens WHERE id = ?", [r.id]);
              return reject(new Error("Refresh token expired"));
            }
            db.run("DELETE FROM refresh_tokens WHERE id = ?", [r.id]);
            return resolve(r.user_id);
          }
        }
        reject(new Error("Refresh token not found"));
      });
    });
  }

  async revokeAllForUser(userId: number) {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM refresh_tokens WHERE user_id = ?", [userId], err => {
        if (err) return reject(err);
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
			if (err) return reject(err);
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
			if (err) return reject(err);
			if (!row || !row.two_factor_secret) return resolve(false);
			const isValid = authenticator.check(token, row.two_factor_secret);
			resolve(isValid);
			}
		);
		});
	}
}	
