import { Database } from "sqlite3";
import { Player, PlayerPayload, GamePayload } from "./models";
import { dbAll, dbGet, dbRunQuery, shuffle } from "./helpers";
import dotenv from "dotenv";

dotenv.config();

const GATEWAY = process.env.GATEWAY_URL;

export class MatchService {
	constructor(private db: Database) { }

	async addMatchRow(matchType: string, name: string | null, owner: string | null) {
		return new Promise<number>((resolve, reject) => {
			this.db.run("INSERT INTO matches (status, type, round, name, owner) VALUES (?, ?, ?, ?, ?)", ['OPEN', matchType, 0, name, owner],
				function (err) {
					if (err) { return reject(err) };
					resolve(this.lastID);
				});
		})
	}

	async addPlayer(player: PlayerPayload, match_id: number): Promise<number> {
		return new Promise<number>((resolve, reject) => {
			this.db.run(
				"INSERT INTO players(user_id, alias, match_id, status)" +
				" VALUES(?, ?, ?, ?)",
				[player.id, player.alias, match_id, 'NOT PLAYED'],
				function (err) {
					if (err) return reject(err);
					resolve(this.lastID);
				})
		})
	}

	async createNewConsoleMatch(matchType: string, players: PlayerPayload[], owner: string | null): Promise<number> {
		try {
			await dbRunQuery(this.db, "BEGIN TRANSACTION");
			const matchId = await this.addMatchRow(matchType, "", owner);

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
		const winnerId = winner[0].user_id;
		//SEND USER ID TO USER SERVICE
	}

	async setPlayerStatus(playerId: number, status: string) {
		await dbRunQuery(this.db, "UPDATE players SET status = ? WHERE id = ?", [status, playerId]);
		let result = await dbGet(this.db, "SELECT * FROM players WHERE id = ?", [playerId]);
	}


	async gameResultsHandler(gameId: number, winner: PlayerPayload, loser: PlayerPayload) {
		const game = await this.getGameById(gameId);
		if (!game) {
			throw new Error("Game not found");
		}
		const matchId = game.match_id;
		await this.recordGameResults(gameId, loser.alias, winner.alias);
		const match = await this.getMatchById(matchId);
		let gamesLeft = await this.checkGamesLeft(match.id, match.round);
		if (gamesLeft.length === 0) {
			await this.createNewRound(match.id, match.name);
			gamesLeft = await this.checkGamesLeft(match.id, match.round);
		}
		if (match.type === "CONSOLE" && gamesLeft && gamesLeft.length > 0)
			this.sendNewGame(gamesLeft[0]!, match.name);
	}

	async recordGameResults(gameId: number, loserAlias: string, winnerAlias: string) {
		const game = await this.getGameById(gameId);
		if (!game) throw new Error("Did not find the game to record win/loss");
		const loser = await dbGet(this.db, "SELECT id FROM players WHERE match_id = ? AND alias = ?", [game.match_id, loserAlias]);
		const winner = await dbGet(this.db, "SELECT id FROM players WHERE match_id = ? AND alias = ?", [game.match_id, winnerAlias]);
		if (!loser.id || !winner.id) throw new Error("Did not find the player id to record win/loss");
		try {
			await this.setPlayerStatus(loser.id, "LOST");
			await this.setPlayerStatus(winner.id, "WON");
			await dbRunQuery(this.db, "UPDATE games SET status = ?, winner = ?, loser = ? WHERE id = ?", ["CLOSED", winnerAlias, loserAlias, gameId]);
		}
		catch (err) {
			throw new Error("Database error recording game results: " + err);
		}
		//LOGIC TO SEND RESULTS TO USER SERVICE
	}

	async getMatchById(matchId: number) {
		const match = await dbGet(this.db, "SELECT * from matches WHERE id = ?", [matchId]);
		return match;
	}

	async getGameById(gameId: number) {
		const game = await dbGet(this.db, "SELECT * from games WHERE id = ?", [gameId]);
		return game;
	}

	async createNewGame(leftPlayer: Player, rightPlayer: Player, matchId: number, round: number, type: string, owner: string | null) {
		await dbRunQuery(
			this.db,
			`INSERT INTO games(
                left_player_id,
                left_player_alias,
                right_player_id,
                right_player_alias,
                match_id,
                round,
				type,
				status,
				owner
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				leftPlayer.user_id,
				leftPlayer.alias,
				rightPlayer.user_id,
				rightPlayer.alias,
				matchId,
				round,
				type,
				"OPEN",
				owner
			]
		);
	}

	async checkGamesLeft(matchId: number, round: number) {
		let games = await dbAll<GamePayload[]>(this.db, "SELECT * FROM games WHERE match_id = ? AND round = ? AND status = ?", [matchId, round, "OPEN"]);
		if (!games)
			throw new Error("Error retrieving games from DB");
		return games;
	}

	async createNewRound(matchId: number, matchName: string) {
		let games = [];
		let { type } = await dbGet(this.db, "SELECT type FROM matches WHERE id = ?", [matchId]);
		await dbRunQuery(this.db, "UPDATE players SET status = ? WHERE match_id = ? AND status = ?", ['NOT PLAYED', matchId, "WON"]);
		let players: Player[] = await dbAll(this.db, "SELECT * FROM players WHERE match_id = ? AND status = ?", [matchId, "NOT PLAYED"]);
		if (players === undefined || players.length === 0)
			throw new Error("No winners in the match");
		if (players.length > 1) {
			const row = await dbGet<{ round: number, owner: string | null, type: string }>(this.db, "SELECT * FROM matches WHERE id = ?", [matchId]);
			if (!row) throw new Error(`No match found with id ${matchId}`);
			const round = row.round + 1;
			players = shuffle(players);
			while (players.length > 1) {
				await this.createNewGame(players[0]!, players[1]!, matchId, round, type, row.owner);
				players.splice(0, 2);
			}
			games = await dbAll(this.db, "SELECT * FROM games WHERE match_id = ? AND round = ?", [matchId, round]);
			await dbRunQuery(this.db, "UPDATE matches SET round = ? WHERE id = ?", [round, matchId]);
			if (row.type === "REMOTE")
				await this.sendGames(matchName, games);
			console.log("games created: ", games);
		}
		if (players.length === 1) {
			this.sendEndOfMatch(matchId, matchName);
		}
	}

	async sendEndOfMatch(matchId: number, matchName: string) {
		const row = await dbGet<{ round: number }>(this.db, "SELECT * FROM matches WHERE id = ?", [matchId]);
		if (!row) throw new Error(`No match found with id ${matchId}`);
		let game = await dbGet(this.db, "SELECT * FROM games WHERE match_id = ? and round = ?", [matchId, row.round])
		let payload = {
			matchId: matchId,
			matchName: matchName,
			winnerAlias: game.winner,
			winnerId: game.winner === game.right_player_alias
				? game.right_player_id
				: game.left_player_id,
			owner: game.owner
		}
		try {
			await fetch(`${GATEWAY}/end_match`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			console.log("End of match sent to gateway");
		}
		catch (error) {
			console.log("Failed to send end of match to gateway: ", error);
			throw error;
		}
	}

	async sendGames(matchName: string, games: any[]) {
		console.log("Games of the round: ", games);
		// for (const game of games) {
		// 	let payload: GamePayload = {
		// 		type: game.type,
		// 		gameId: game.id,
		// 		leftPlayer: { id: game.left_player_id, alias: game.left_player_alias },
		// 		rightPlayer: { id: game.right_player_id, alias: game.right_player_alias },
		// 		owner: game.owner
		// 	}
		// 	try {
		// 		await fetch(`${GATEWAY}/game/start`, {
		// 			method: "POST",
		// 			headers: { "Content-Type": "application/json" },
		// 			body: JSON.stringify(payload)
		// 		});
		// 		console.log("REMOTE game sent to game engine");
		// 	}
		// 	catch (error) {
		// 		console.log("Failed to send games to game engine: ", error);
		// 		throw error;
		// 	}
		// }
		await fetch(`${GATEWAY}/newround`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ matchName: matchName, games: games })
		});
		return games;
	}

	async sendNewGame(matchId: number, round: number, matchName: string){
		let gamesLeft = await this.checkGamesLeft(matchId, round);
		console.log("gamesLeft: ", gamesLeft)
		if (gamesLeft.length > 0){
			const game = gamesLeft[0];
			await fetch(`${GATEWAY}/newgame`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({matchName: matchName,  game: game })
		});

		}
	}
}


