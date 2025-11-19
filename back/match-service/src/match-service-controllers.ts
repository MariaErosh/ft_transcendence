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
			matchId: matchId,
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
		const games = await matchService.createNewRound(matchId);
		for (const game of games) {
			let payload: GamePayload = {
				type: "REMOTE",
				matchId: game.id,
				leftPlayer: { id: game.left_player_id, alias: game.left_player_alias },
				rightPlayer: { id: game.right_player_id, alias: game.right_player_alias },
			}
			await fetch(`http://gateway:3000/game/start`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(game)
			});
			console.log("REMOTE game sent to game engine");
		}
		//ADD ERROR CHECKING
		return { matchId: matchId, games: games };
	})

	// fastify.post('/match/remote/new', { schema: newMatchSchema }, async (request, reply) => {
	// 	console.log("Match service received a get request at /match/remote/new");
	// 	const payload = (request.body as { name: string }).name;
	// 	const newMatchId = await matchService.addMatchRow("REMOTE", payload);
	// 	const res = { name: payload, id: newMatchId };
	// 	return res;
	// })

	// fastify.get('/match/remote/open', async (request, reply) => {
	// 	console.log("Match service received a get request at /match/open");
	// 	const res = await matchService.getOpenMatches();
	// 	return res;
	// })
	// fastify.post('/match/remote/join', async (request, reply) => {
	// 	const rawId = request.headers["x-user-id"];
	// 	if (typeof rawId !== "string") {
	// 		throw new Error("Missing x-user-id header");
	// 	}

	// 	const player: PlayerPayload = {
	// 		alias: request.headers["x-username"] as string,
	// 		id: Number(rawId)
	// 	};
	// 	const payload = (request.body as { matchId: number }).matchId;
	// 	console.log(`Received from gateway: player alias: ${player.alias}, id: ${player.id}`);
	// 	const playerId = await matchService.addPlayer(player, payload);
	// 	return playerId;
	// })
}
