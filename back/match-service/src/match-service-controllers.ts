import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createMatchSchema } from "./schemas";
import { InputPlayer } from "./models";
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

interface CreateMatchPayload{
	players: InputPlayer[];
}

export async function matchRoutes(fastify: FastifyInstance, matchService:MatchService){
	fastify.post<{
		Body: CreateMatchPayload
	}>('/match', {schema: createMatchSchema}, async (request, reply) => {
		if (!ensureFromGateway(request, reply)) return;
		const { players } = request.body;
		const matchId = await matchService.createNewMatch(players);
		return matchId;
	})
}
