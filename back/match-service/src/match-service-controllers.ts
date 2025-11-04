import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createMatchSchema } from "./schemas";
import { CreateMatchPayload, GamePayload } from "./models";
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



export async function matchRoutes(fastify: FastifyInstance, matchService:MatchService){
	fastify.post<{
		Body: CreateMatchPayload
	}>('/match', {schema: createMatchSchema}, async (request, reply) => {
		// if (!ensureFromGateway(request, reply)) return;
		const match = request.body;
		const matchId = await matchService.createNewMatch(match.type, match.players);
		const nextPlayers = await matchService.getNextPlayers(matchId);
		//ADD ERROR CHECKING
		let result: GamePayload = {
			type: match.type,
			leftPlayer: nextPlayers[0],
			rightPlayer: nextPlayers[1],
		}
		return result;
	})
}
