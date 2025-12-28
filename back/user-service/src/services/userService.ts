import { Database } from "sqlite3";

interface UserRow {
  id: number;
  auth_user_id: number;
  username: string;
  email: string;
  created_at: string;
  games_played: number;
  games_won: number;
}


export class UserService {
	constructor(private db_inst: Database) {}

	async createUser(auth_user_id: number, username: string, email: string, displayName?: string) {
		return new Promise<{ id: number; username: string; email: string}>((resolve, reject) => {
		this.db_inst.run(
			"INSERT INTO users (auth_user_id, username, email) VALUES (?, ?, ?)",
			[auth_user_id, username, email],
			function (err) {
			if (err) return reject(err);
			resolve({ id: this.lastID, username, email });
			}
		);
		});
	}

	async getUserById(id: number) {
		return new Promise<UserRow| undefined>((resolve, reject) => {
		this.db_inst.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
			if (err) return reject(err);
			resolve(row as UserRow | undefined);
		});
		});
	}

	async getUserByAuthUserId(id: number) {
		return new Promise<UserRow|undefined>((resolve, reject) => {
		this.db_inst.get("SELECT * FROM users WHERE auth_user_id = ?", [id], (err, row) => {
			if (err) return reject(err);
			resolve(row as UserRow | undefined);
		});
		});
	}

	async getUserByUsername(username: string) {
		return new Promise<UserRow[]>((resolve, reject) => { //because username is not unique, returning array of users
		this.db_inst.all("SELECT * FROM users WHERE username = ?", [username], (err, rows) => {
			if (err) return reject(err);
			resolve(rows as UserRow[]);
		});
		});
	}

	async getAll() : Promise<UserRow[]> {
		return new Promise((resolve, reject) => {
			this.db_inst.all("SELECT id, username, email FROM users", (err, rows) =>	{
				if (err) return reject(err);
				resolve(rows as UserRow[]);
			});
		});
	}

	async deleteUser(id: number) {
		return new Promise<boolean>((resolve, reject) => {
		this.db_inst.run("DELETE FROM users WHERE id = ?", [id], function (err) {
			if (err) return reject(err);
			resolve(this.changes > 0); //.canges gives number of rows affected
		});
		});
	}

	async updateUserByAuthId(
		auth_user_id: number,
		data: Partial<{ username: string;
						email: string;
						displayName: string
					}>
	): Promise<UserRow | undefined> {
		const fields: string[] = [];
		const values: (string | number | null)[] = [];

		if (data.username) {
			fields.push("username = ?");
			values.push(data.username);
		}
		if (data.email) {
			fields.push("email = ?");
			values.push(data.email);
		}
		if (data.displayName) {
			fields.push("display_name = ?");
			values.push(data.displayName);
		}
		if (fields.length === 0)
			return undefined;

		values.push(auth_user_id);
		const db = this.db_inst;

		return new Promise<UserRow | undefined>((resolve, reject) => {
			db.run(
				`UPDATE users SET ${fields.join(", ")} WHERE auth_user_id = ?`,
				values,
				function (err) {
					if (err) return reject(err);
					if (this.changes === 0) return resolve(undefined);

					db.get(
					"SELECT * FROM users WHERE auth_user_id = ?",
					[auth_user_id],
					(err2, row) => {
						if (err2) return reject(err2);
						resolve(row as UserRow | undefined);
					}
					);
				}
			);
		});
	}

	async getStats(auth_user_id: number): Promise<{ games_played: number; games_won: number } | undefined> {
		return new Promise((resolve, reject) => {
			(this.db_inst.get as any)(
				"SELECT games_played, games_won FROM users WHERE auth_user_id = ?",
				[auth_user_id],
				(
					err: Error | null,
					row :{games_played: number; games_won: number } | undefined) => {
						if (err) return reject(err);
						if (!row) return resolve(undefined);
						resolve({
						games_played: Number(row.games_played) || 0,
						games_won: Number(row.games_won) || 0,
					});
				}
			);
		});
	}

	async getStatsForUsers(ids: number[]): Promise<{ auth_user_id: number; games_played: number; games_won: number}[]> {
		if (!ids.length) return [];
		const placeholders = ids.map(() => "?").join(", ");
		const sql = `SELECT auth_user_id, games_played, games_won FROM users WHERE auth_user_id IN (${placeholders})`;
		return new Promise((resolve, reject) => {
			(this.db_inst.all as any)(sql, ids, (err: Error | null, rows: {auth_user_id: number; games_played: number; games_won: number}[]) => {
			if (err) return reject(err);
			resolve(rows.map(r => ({
				auth_user_id: r.auth_user_id,
				games_played: Number(r.games_played) || 0,
				games_won: Number(r.games_won) || 0,
			})));
			});
		});
	}

	async updateStats(
						auth_user_id: number,
						played: number = 1,
						won: number = 0
	): Promise<UserRow | undefined> {
		const db = this.db_inst;

		return new Promise<UserRow | undefined>((resolve, reject) => {
			if (played < 0 || won < 0) return reject(new Error("Invalid stats values"));

			db.run(
				`UPDATE users
				 SET games_played = games_played + ?,
					games_won = games_won + ?
				 WHERE auth_user_id = ?`,
				[played, won, auth_user_id],
				function (err) {
					if (err) return reject(err);
					if (this.changes === 0) return resolve(undefined);

					db.get(
					"SELECT * FROM users WHERE auth_user_id = ?",
					[auth_user_id],
					(err2, row) => {
						if (err2) return reject(err2);
						resolve(row as UserRow | undefined);
					}
					);
				}
			);
		});
	}





}
