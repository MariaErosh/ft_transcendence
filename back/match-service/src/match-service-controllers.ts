import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createMatchSchema, resultSchema } from "./schemas";
import { CreateMatchPayload, GamePayload, PlayerPayload, resultPayload } from "./models";
import { MatchService } from "./match-service";
import dotenv from "dotenv";

dotenv.config();

const GATEWAY_SECRET = process.env.GATEWAY_SECRET;

function ensureFromGateway(req: FastifyRequest, reply: FastifyReply) {
	const gw = (req.headers as any)['x-gateway-secret'];
	if (!gw || gw !== GATEWAY_SECRET) {
		reply.status(401).send({ error: "Unauthorized (gateway only)" });
		return false;
	}
	return true;
}

export async function matchRoutes(fastify: FastifyInstance, matchService: MatchService) {
	fastify.post<{
		Body: CreateMatchPayload
	}>('/match/console/new', { schema: createMatchSchema }, async (request, reply) => {
		// if (!ensureFromGateway(request, reply)) return;
		const match = request.body;
		const matchId = await matchService.createNewConsoleMatch(match.type, match.players);
		const nextPlayers = await matchService.getNextPlayers(matchId);
		//ADD ERROR CHECKING
		let result: GamePayload = {
			type: match.type,
			gameId: matchId,
			leftPlayer: { id: nextPlayers[0]!.user_id, alias: nextPlayers[0]!.alias },
			rightPlayer: { id: nextPlayers[1]!.user_id, alias: nextPlayers[1]!.alias },
		}
		return result;
	})
	fastify.post<{
		Body: resultPayload
	}>('/match/console/result', { schema: resultSchema }, async (request, reply) => {
		// if (!ensureFromGateway(request, reply)) return;
		console.log("Match service received a post request at /match/result");
		const gameResult = request.body;
		await matchService.recordGameResults(gameResult.gameId, gameResult.loser.alias, gameResult.winner.alias);
		const match = await matchService.getMatchById(gameResult.gameId);
		const nextPlayers = await matchService.getNextPlayers(gameResult.gameId);
		let newGame: GamePayload;
		if (nextPlayers.length === 1) {
			newGame = {
				type: match.type,
				gameId: -1,
				leftPlayer: { id: nextPlayers[0]!.user_id, alias: nextPlayers[0]!.alias },
				rightPlayer: { id: -1, alias: "" },
			}
		}
		else {
			newGame = {
				type: match.type,
				gameId: gameResult.gameId,
				leftPlayer: { id: nextPlayers[0]!.user_id, alias: nextPlayers[0]!.alias },
				rightPlayer: { id: nextPlayers[1]!.user_id, alias: nextPlayers[1]!.alias },
			}
		}
		console.log("Returning from match/result endpoint: ", newGame);
		return newGame;
	})

	fastify.post<{
		Body: CreateMatchPayload
	}>('/match/remote/new', { schema: createMatchSchema }, async (request, reply) => {
		// if (!ensureFromGateway(request, reply)) return;
		console.log("In match/remote/new");
		const match = request.body;
		const matchId = await matchService.addMatchRow(match.type, match.name);
		for (const player of match.players) {
			await matchService.addPlayer(player, matchId);
		}
		const games = await matchService.createNewRound(matchId, match.name!);
		//ADD ERROR CHECKING
		return { matchId: matchId, games: games };
	})

	fastify.post<{
		Body: resultPayload
	}>('/match/result', { schema: resultSchema }, async (request, reply) => {
		console.log("Match service received a post request at /match/result");
		const gameResult = request.body;
		await matchService.recordGameResults(gameResult.gameId, gameResult.loser.alias, gameResult.winner.alias);
		const match = await matchService.getMatchById(gameResult.gameId);
		const gamesLeft = await matchService.checkGamesLeft(match.id, match.round);
		if (gamesLeft === 0){
			await matchService.createNewRound(match.id, match.name);
		}
	})

	fastify.get('/match/game', async (request, reply) => {
		const { gameId } = request.query as { gameId: string };
		const gameIdN = Number(gameId);
		if (isNaN(gameIdN)) return reply.status(400).send({ error: "Incorrect gameId" });;
		const game = await matchService.getGameById(gameIdN);
		if (!game) return reply.status(400).send({ error: "Game not found" });;
		
		if (!game.left_player_alias || !game.right_player_alias) {
			return reply.status(500).send({ 
				error: "Incomplete game data on server", 
				gameId: gameIdN 
			});
		}

		console.log("fetched game:", game);
		let payload: GamePayload = {
			type: game.type,
			gameId: game.id,
			leftPlayer: { id: game.left_player_id, alias: game.left_player_alias },
			rightPlayer: { id: game.right_player_id, alias: game.right_player_alias },
		}
		return payload;
	})

}
