import { Database } from "sqlite3";
import { Player, PlayerPayload, GamePayload } from "./models";
import { dbAll, dbGet, dbRunQuery, shuffle } from "./helpers";
import { requiredEnv } from "./match-service-controllers";
import pino from "pino";

const logger = pino({
	level: 'info',
	transport: {
		targets: [
			{ target: 'pino/file', options: { destination: 1 } },
			{
				target: 'pino-socket',
				options: { address: 'logstash', port: 5000, mode: 'tcp', reconnect: true }
			}
		]
	}
});


const GATEWAY_URL = `${requiredEnv("GATEWAY_SERVICE")}:${requiredEnv("GATEWAY_PORT")}`;

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

			// Notify players they joined the match
			const playerIds = players.map(p => p.id).filter((id): id is number => id !== null);
			await this.notifyMatchJoined(matchId, "", matchType, playerIds);

			return matchId;
		} catch (err) {
			await dbRunQuery(this.db, "ROLLBACK");
			logger.error({ err }, "Error creating a new match");
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

		// Notify players about game result via chat
		if (winner.id !== null && loser.id !== null) {
			await this.notifyGameResult(winner.id, loser.id, gameId);
		}

		let match = await this.getMatchById(matchId);
		let gamesLeft = await this.checkGamesLeft(match.id, match.round);
		if (gamesLeft.length === 0) {
			// Notify about tournament round completion
			await this.notifyRoundComplete(matchId, match.round);

			await this.createNewRound(match.id, match.name);
			match = await this.getMatchById(matchId);
			gamesLeft = await this.checkGamesLeft(match.id, match.round);
		}
		if (match.type === "CONSOLE" && gamesLeft && gamesLeft.length > 0) {
			console.log("sending new game in match service backend");
			this.sendNewGame(matchId, match.round, match.name);
		}
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

		const row = await dbGet<{ round: number, owner: string | null, type: string }>(this.db, "SELECT * FROM matches WHERE id = ?", [matchId]);
		if (!row) throw new Error(`No match found with id ${matchId}`);
		if (players.length > 1) {
			//const row = await dbGet<{ round: number, owner: string | null, type: string }>(this.db, "SELECT * FROM matches WHERE id = ?", [matchId]);
			//if (!row) throw new Error(`No match found with id ${matchId}`);
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
			logger.info({ games }, "games created");
		}
		if (players.length === 1) {
			const currentRoundGames = await dbAll(this.db, "SELECT * FROM games WHERE match_id = ? AND round = ? AND status = ?", [matchId, row.round + 1, "OPEN"]);
			if (!currentRoundGames || currentRoundGames.length === 0) {
			const lastGame = await dbGet(this.db, "SELECT * FROM games WHERE match_id = ? AND round = ?", [matchId, row.round]);
			// if (lastGame && lastGame.winner) {
				this.sendEndOfMatch(matchId, matchName);
			} else {
				logger.info("Not sending end_match: last game not finished yet");
			}
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
			await fetch(`${GATEWAY_URL}/end_match`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			logger.info("End of match sent to gateway");
		}
		catch (error) {
			logger.error({ err: error }, "Failed to send end of match to gateway");
			throw error;
		}
	}

	async sendGames(matchName: string, games: any[]) {
		logger.info({ games }, "Games of the round");
		await fetch(`${GATEWAY_URL}/newround`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ matchName: matchName, games: games })
		});
		return games;
	}

	async sendNewGame(matchId: number, round: number, matchName: string){
		let gamesLeft = await this.checkGamesLeft(matchId, round);
		logger.info({ gamesLeft }, "gamesLeft");
		if (gamesLeft.length > 0){
			const game = gamesLeft[0];
			await fetch(`${GATEWAY_URL}/newgame`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({matchName: matchName,  game: game })
		});

		}
	}

	private async notifyGameResult(winnerId: number, loserId: number, gameId: number) {
		try {
			await fetch(`${GATEWAY_URL}/chat/notifications/game-result`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-gateway-secret': process.env.GATEWAY_SECRET || ''
				},
				body: JSON.stringify({
					winnerId,
					loserId,
					gameId
				})
			});
		} catch (error) {
			logger.error({ error }, 'Failed to send game result notification');
		}
	}

	private async notifyRoundComplete(matchId: number, round: number) {
		try {
			const players = await this.getMatchPlayers(matchId);
			const playerIds = players.map((p: any) => p.user_id);

			await fetch(`${GATEWAY_URL}/chat/notifications/tournament-round`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-gateway-secret': process.env.GATEWAY_SECRET || ''
				},
				body: JSON.stringify({
					matchId,
					round,
					playerIds
				})
			});
		} catch (error) {
			logger.error({ error }, 'Failed to send round complete notification');
		}
	}

	private async getMatchPlayers(matchId: number): Promise<any[]> {
		return await dbAll(this.db,
			"SELECT DISTINCT user_id FROM players WHERE match_id = ?",
			[matchId]
		);
	}

	private async notifyMatchJoined(matchId: number, matchName: string, matchType: string, playerIds: number[]) {
		try {
			await fetch(`${GATEWAY_URL}/chat/notifications/match-joined`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-gateway-secret': process.env.GATEWAY_SECRET || ''
				},
				body: JSON.stringify({
					matchId,
					matchName,
					matchType,
					playerIds
				})
			});
		} catch (error) {
			logger.error({ error }, 'Failed to send match joined notification');
		}
	}
}


