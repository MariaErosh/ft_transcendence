import { Database } from "sqlite3";
import { Player, PlayerPayload } from "./models";
import { dbAll, dbGet, dbRunQuery } from "./helpers";



export class MatchService {
	constructor(private db: Database) { }

	async addMatchRow(matchType: string) {
		return new Promise<number>((resolve, reject) => {
			this.db.run("INSERT INTO matches (status, type) VALUES (?, ?)", ['IN PROGRESS', matchType],
				function (err) {
					if (err) { return reject(err) };
					resolve(this.lastID);
				});
		})
	}

	async addPlayer(player: PlayerPayload, match_id: number): Promise<number> {
		return new Promise<number>((resolve, reject) => {
			this.db.run(
				"INSERT INTO players(auth_user_id, alias, match_id, status)" +
				" VALUES(?, ?, ?, ?)",
				[player.id, player.alias, match_id, 'NOT PLAYED'],
				function (err) {
					if (err) return reject(err);
					resolve(this.lastID);
				})
		})
	}

	async createNewMatch(matchType: string, players: PlayerPayload[]): Promise<number> {
		try {
			await dbRunQuery(this.db, "BEGIN TRANSACTION");
			const matchId = await this.addMatchRow(matchType);

			for (let player of players) {
				await this.addPlayer(player, matchId);
			}

			await dbRunQuery(this.db, "COMMIT");
			return matchId;
		} catch (err) {
			await dbRunQuery(this.db, "ROLLBACK");
			console.error("Error creating a new match", err);
			throw err;
		}
	}

	pickTwoRandomPlayers(players: Player[]): [Player, Player] {
		let player1 = Math.floor(Math.random() * players.length);
		let player2 = player1;
		do {
			player2 = Math.floor(Math.random() * players.length);
		} while (player1 === player2);
		return [players[player1]!, players[player2]!];
	}
	//TO DO: FIGURE OUT HOW TO CONNECT TO USER SERVICE
	async recordMatchWinner(matchId: number) {
		let winner = await dbAll(this.db, "SELECT from players WHERE match_id = ? AND status = ?", [matchId, 'WON']);
		if (winner.length !== 1)
			throw new Error("Number of match winners: " + winner.length);
		const winnerId = winner[0].auth_user_id;
		//SEND USER ID TO USER SERVICE
	}

	async finishMatch(matchId: number) {
		await this.recordMatchWinner(matchId);
		await dbRunQuery(this.db, "DELETE FROM games WHERE match_id = ?", [matchId]);
		await dbRunQuery(this.db, "DELETE FROM players WHERE match_id = ?", [matchId]);
		await dbRunQuery(this.db, "DELETE FROM matches WHERE id = ?", [matchId]);
	}

	async setPlayerStatus(playerId: number, status: string) {
		await dbRunQuery(this.db, "UPDATE players SET status = ? WHERE id = ?", [status, playerId]);
		let result = await dbGet(this.db, "SELECT * FROM players WHERE id = ?", [playerId]);
	}

	async getNextPlayers(matchId: number): Promise<Player[]> {
		let players = await dbAll(this.db, "SELECT * FROM players WHERE match_id = ? AND status = ?", [matchId, "NOT PLAYED"]);
		if (players.length < 2) {
			await dbRunQuery(this.db, "UPDATE players SET status = ? WHERE match_id = ? AND status = ?", ['NOT PLAYED', matchId, "WON"]);
			players = await dbAll(this.db, "SELECT * FROM players WHERE match_id = ? AND status = ?", [matchId, "NOT PLAYED"]);
		}
		if (players.length === 0)
			throw new Error("No winners in the match");
		if (players.length > 2)
			players = this.pickTwoRandomPlayers(players);
		return players;
	}

	async recordGameResults(matchId: number, loserAlias: string, winnerAlias: string) {
		const loser = await dbGet(this.db, "SELECT id FROM players WHERE match_id = ? AND alias = ?", [matchId, loserAlias]);
		const winner = await dbGet(this.db, "SELECT id FROM players WHERE match_id = ? AND alias = ?", [matchId, winnerAlias]);
		if (!loser.id || !winner.id) throw new Error("Did not find the player id to record win/loss");
		try {
			await this.setPlayerStatus(loser.id, "LOST");
			await this.setPlayerStatus(winner.id, "WON");
		}
		catch (err) {
			throw new Error("Database error recording game results: " + err);
		}
		//LOGIC TO SEND RESULTS TO USER SERVICE
	}

	async getMatchById(matchId:number){
		const match = await dbGet(this.db, "SELECT * from matches WHERE id = ?", [matchId]);
		return match;
	}
}


