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
		request.log.info({ body: request.body }, "In match/new, received");
		const match = request.body;
		const matchId = await matchService.addMatchRow(match.type, match.name, match.owner);
		for (const player of match.players) {
			await matchService.addPlayer(player, matchId);
		}
		await matchService.createNewRound(matchId, match.name!);
		if (match.type === "CONSOLE")
			matchService.sendNewGame(matchId, 1, match.name!);
		//ADD ERROR CHECKING
		//return reply.code(200);
		return reply.code(200).send({ status: "ok" });
	})

	fastify.post<{ Body: resultPayload }>('/match/result', { schema: resultSchema }, async (request, reply) => {
		request.log.info({ body: request.body }, "Match service received a post request at /match/result");
		const { gameId, winner, loser } = request.body;
		try{
			matchService.gameResultsHandler(gameId, winner, loser);
		}
		catch (err){
			reply.code(400).send({ error: err });
		}
		reply.send({ ok: true });
	});


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

		request.log.info({ game }, "fetched game");
		let payload: GamePayload = {
			type: game.type,
			gameId: game.id,
			leftPlayer: { id: game.left_player_id, alias: game.left_player_alias },
			rightPlayer: { id: game.right_player_id, alias: game.right_player_alias },
			owner:game.owner
		}
		return payload;
	})

}
