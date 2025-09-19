import { Database } from "sqlite3";

interface UserRow {
  id: number;
  auth_user_id: number;
  username: string;
  email: string;
  created_at: string;
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
		this.db_inst.all("SELECT username, email FROM users", (err, rows) =>	{
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
}
