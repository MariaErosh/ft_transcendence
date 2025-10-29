import { FastifyInstance } from "fastify";
import { createMatchSchema } from "./schemas";
import { InputPlayer } from "./models";
import { MatchService } from "./match-service";


interface CreateMatchBody{
	players: InputPlayer[];
}
export async function matchRoutes(fastify: FastifyInstance, matchService:MatchService){
	fastify.post<{
		Body: CreateMatchBody
	}>('/matches', {schema: createMatchSchema}, async (request, reply) => {
		const { players } = request.body;
		const matchId = await matchService.createNewMatch(players);
	})
}
