import { Database } from "sqlite3";
import { Player } from "./models";
import { dbAll, dbRunQuery } from "./helpers";

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

	async addPlayer(player: InputPlayer, match_id: number): Promise<number> {
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

	async createNewMatch(players: InputPlayer[]): Promise<number> {
		return new Promise<number>(async (resolve, reject) => {
			try {
				await dbRunQuery(this.db, "BEGIN TRANSACTION");
				const matchId = await this.addMatchRow();
				for (let player of players) {
					await this.addPlayer(player, matchId);
				}
				await dbRunQuery(this.db, "COMMIT");
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
//TO DO: FIGURE OUT HOW TO CONNECT TO USER SERVICE
	async recordMatchWinner(matchId: number){
		let winner = await dbAll(this.db, "SELECT from players WHERE match_id = ? AND status = ?", [matchId, 'WON']);
		if (winner.length !== 1)
			throw new Error ("Number of match winners: " + winner.length);
		const winnerId = winner[0].auth_user_id;
		//SEND USER ID TO USER SERVICE
	}

	async finishMatch(matchId: number){
		await this.recordMatchWinner(matchId);
		await dbRunQuery(this.db, "DELETE FROM games WHERE match_id = ?", [matchId]);
		await dbRunQuery(this.db, "DELETE FROM players WHERE match_id = ?", [matchId]);
		await dbRunQuery(this.db, "DELETE FROM matches WHERE id = ?", [matchId]);
	}

	async setPlayerStatus(playerId:number, status:string){
		await dbRunQuery(this.db, "UPDATE players SET status = ? WHERE id = ?", [status, playerId]);
	}

	async getNextPlayers(matchId: number): Promise<Player[]> {
	let players = await dbAll(this.db, "SELECT * FROM players WHERE match_id = ? AND status = ?", [matchId, "NOT PLAYED"]);
	if (players.length < 2) {
		await dbRunQuery(this.db,"UPDATE players SET status = ? WHERE match_id = ? AND status = ?", ['NOT PLAYED', matchId, "WON"]);
		players = await dbAll(this.db, "SELECT * FROM players WHERE match_id = ? AND status = ?", [matchId, "NOT PLAYED"]);
	}
	if (players.length === 0)
		throw new Error("No winners in the match");
	if (players.length > 2)
		players = this.pickTwoRandomPlayers(players);
	return players;
	}

	async recordGameResults(loserId: number, winnerId: number){
		try{
			await this.setPlayerStatus(loserId, "LOST");
			await this.setPlayerStatus(winnerId, "WON");
		}
		catch(err){
			throw new Error ("Database error recording game results: " + err);
		}
		//LOGIC TO SEND RESULTS TO USER SERVICE
	}
}
