import { resolve } from "path";
import { Database } from "sqlite3";

export interface InputPlayer {
	auth_user_id: number | null,
	alias: string,
	remote: number
}

export class MatchService {
	constructor(private db: Database) { }

	async addMatchRow() {
		return new Promise<number>((resolve, reject) => {
			this.db.run("INSERT INTO matches (status) VALUES ('IN PROGRESS')",
				function (err) {
					if (err) { return reject(err) };
					resolve(this.lastID);
				});
		})
	}

	async addPlayer(player: InputPlayer, match_id: number) {
		return new Promise<number>((resolve, reject) => {
			this.db.run(
				"INSERT INTO players(auth_user_id, alias, match_id, status, remote)" +
				" VALUES(?, ?, ?, ?, ?)",
				[player.auth_user_id, player.alias, match_id, 'NOT PLAYED', player.remote],
				function(err){
					if (err) return reject(err);
					resolve (this.lastID);
				})
		})
	}

	// async createNewMatch(players:[InputPlayer]){
	// 	this.addMatchRow
	// }
}
