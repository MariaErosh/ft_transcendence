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
	}>('/match/new', { schema: createMatchSchema }, async (request, reply) => {
		// if (!ensureFromGateway(request, reply)) return;
		const match = request.body;
		const matchId = await matchService.createNewMatch(match.type, match.players);
		const nextPlayers = await matchService.getNextPlayers(matchId);
		//ADD ERROR CHECKING
		let result: GamePayload = {
			type: match.type,
			matchId: matchId,
			leftPlayer: { id: nextPlayers[0]!.user_id, alias: nextPlayers[0]!.alias },
			rightPlayer: { id: nextPlayers[1]!.user_id, alias: nextPlayers[1]!.alias },
		}
		return result;
	})
	fastify.post<{
		Body: resultPayload
	}>('/match/result', { schema: resultSchema }, async (request, reply) => {
		// if (!ensureFromGateway(request, reply)) return;
		console.log("Match service received a post request at /match/result");
		const gameResult = request.body;
		await matchService.recordGameResults(gameResult.matchId, gameResult.loser.alias, gameResult.winner.alias);
		const match = await matchService.getMatchById(gameResult.matchId);
		const nextPlayers = await matchService.getNextPlayers(gameResult.matchId);
		let newGame: GamePayload;
		if (nextPlayers.length === 1) {
			newGame = {
				type: match.type,
				matchId: -1,
				leftPlayer: { id: nextPlayers[0]!.user_id, alias: nextPlayers[0]!.alias },
				rightPlayer: { id: -1, alias: "" },
			}
		}
		else {
			newGame = {
				type: match.type,
				matchId: gameResult.matchId,
				leftPlayer: { id: nextPlayers[0]!.user_id, alias: nextPlayers[0]!.alias },
				rightPlayer: { id: nextPlayers[1]!.user_id, alias: nextPlayers[1]!.alias },
			}
		}
		console.log("Returning from match/result endpoint: ", newGame);
		return newGame;
	})

	fastify.post('/match/join', async (request, reply)=>{
		const player: PlayerPayload = {
			alias: request.headers['x-username'],
			id: request.headers['x-user-id']
		}
		console.log(`Received from gateway: player alias: ${player.alias}, id: ${player.id}`);
		const match = matchService.joinRemoteMatch(player);
		return match;
	})
}
