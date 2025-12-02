import { server, games, gameStates, playerKeys } from "./connectionHandler.js"
import { GameObject, GameState, PlayerSocket } from "./gameSpecs.js";
import { FastifyRequest, FastifyReply } from "fastify";

// server.post("/game/start", async (request: FastifyRequest, reply: FastifyReply) => {
// 	console.log("received post request with body: ", request.body);
// 	const newGame = request.body as GameObject;

// 	if (!newGame.leftPlayer || !newGame.rightPlayer || !newGame.gameId || !newGame.type) {
// 		return reply.status(400).send({ error: "Missing player info or match id" });
// 	}
// 	games.set(newGame.gameId, newGame);
// 	gameStates.set(newGame.gameId, new GameState(newGame));


// });

// server.post("/game/move", async (request: FastifyRequest, reply: FastifyReply) => {
// 	console.log("received post request with body: ", request.body);
// 	const { whichPlayer, dir }: { whichPlayer: 'left' | 'right'; dir: 'up' | 'down' | 'stop' } = request.body as any;

// 	if (whichPlayer != 'left' && whichPlayer != 'right')
// 		return reply.status(400).send({ error: "Missing or invalid player - has to be 'left' or 'right'" });
// 	if (dir != 'up' && dir != 'down' && dir != 'stop')
// 		return reply.status(400).send({ error: "Missing or invalid move - has to be 'up' or 'down'" });
// 	if (whichPlayer === 'left') {
// 		dir === 'up' ?
// 			(playerKeys.left.up = true, playerKeys.left.down = false) :
// 			dir === 'down' ?
// 				(playerKeys.left.down = true, playerKeys.left.up = false)
// 				: (playerKeys.left.down = false, playerKeys.left.up = false);
// 	} else {
// 		dir === 'up' ?
// 			(playerKeys.right.up = true, playerKeys.right.down = false) :
// 			dir === 'down' ?
// 				(playerKeys.right.down = true, playerKeys.right.up = false)
// 				: (playerKeys.right.down = false, playerKeys.right.up = false);
// 	}
// });


// server.get("/game/stop", async (request: FastifyRequest, reply: FastifyReply) => {
// 	console.log("received stop request");
// 	const ws = [...clients][0];
// 	ws.send(JSON.stringify({ type: "stop" }));
// 	console.log("Stop message sent to client");

// 	return reply.send({ ok: true, message: "stop message sent" });
// });
