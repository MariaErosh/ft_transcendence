import { Database } from "sqlite3";
import { Player } from "./models";
import { dbAll } from "./helpers";

export interface InputPlayer {
	auth_user_id: number | null,
	alias: string,
	remote: number
}

export class MatchService {
	constructor(private db: Database) { }

	private runQuery(sql: string, params: any[] = []): Promise<void> {
		return new Promise((resolve, reject) => {
			this.db.run(sql, params, (err) => {
				if (err) return reject(err);
				resolve();
			});
		});
	}

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
				function (err) {
					if (err) return reject(err);
					resolve(this.lastID);
				})
		})
	}

	async createNewMatch(players: InputPlayer[]) {
		return new Promise<number>(async (resolve, reject) => {
			try {
				await this.runQuery("BEGIN TRANSACTION");
				const matchId = await this.addMatchRow();
				for (let player of players) {
					await this.addPlayer(player, matchId);
				}
				await this.runQuery("COMMIT");
				resolve(matchId);
			}
			catch (err) {
				console.log("Error creating a new match", err);
				reject(err);
			}
		})

	}

	pickTwoRandomPlayers(players: Player[]): [Player, Player] {
		console.log("Getting random players");
		let player1 = Math.floor(Math.random() * players.length);
		let player2 = player1;
		do {
			player2 = Math.floor(Math.random() * players.length);
		} while (player1 === player2);
		return [players[player1]!, players[player2]!];
	}

	async getNextPlayers(matchId: number) {
		return new Promise<Player[]>(async (resolve, reject) => {
			try {
				let players = await dbAll(this.db, "SELECT * FROM players WHERE match_id = ? AND status = ?", [matchId, "NOT PLAYED"]);
				if (players.length < 2) {
					players = await dbAll(this.db, "SELECT * FROM players WHERE match_id = ? AND status = ?", [matchId, "WON"]);
					if (players.length === 1)
						resolve(players);
					if (players.length === 0)
						reject();
					await this.runQuery("UPDATE players SET status = ? WHERE match_id = ? AND status = ?", ['NOT PLAYED', matchId, "WON"]);
					players = await dbAll(this.db, "SELECT * FROM players WHERE match_id = ? AND status = ?", [matchId, "NOT PLAYED"]);
				}
				if (players.length > 2)
					players = this.pickTwoRandomPlayers(players);
				resolve(players);
			}
			catch (err) {
				reject(err);
			}
		})

	}
}
