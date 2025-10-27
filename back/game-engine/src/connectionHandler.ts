import { WebSocketServer } from "ws";
import { serveBall, resetSpecs, updatePos } from "./gamePlay.js";
import { board, gameState } from "./gameSpecs.js";

export const playerKeys = {
	left: { up:false, down:false },
	right: { up: false, down: false },
};

const wss = new WebSocketServer({ port: 3003});
console.log('Websocket for game engine is up');

let interval: NodeJS.Timeout | null = null;

wss.on('connection', (ws) => {
	console.log('Client connected');

	ws.send(JSON.stringify({ type: "consts", data: board}));
	ws.on('message', (data) => {
		const message = JSON.parse(data.toString());
		console.log('Parsed message: ', message);
		if (message.type === "ready") {
			console.log('Client is ready, starting game');
			ws.send(JSON.stringify({type: "set", data: gameState}));
		}
		if (message.type === "please serve") {
			console.log("serving ball");
			serveBall();
			ws.send(JSON.stringify({ type: "go"}));
			interval = setInterval(() => {
				updatePos();
				ws.send(JSON.stringify({ type: "state", data: gameState }));
			}, 1000/ 60);
		}
		if (message.type === "input") {
			handleInput(message.data.code, message.data.pressed);
		}
	});
	ws.on("close", () => {
		console.log("Client disconnected");
		if (interval) clearInterval(interval);
	});
});


function handleInput(code: string, pressed: boolean) {
	if (code === 'ArrowUp')
		playerKeys.right.up = pressed;
	if (code === 'ArrowDown')
		playerKeys.right.down = pressed;
	if (code === 'KeyW')
		playerKeys.left.up = pressed;
	if (code === 'KeyS')
		playerKeys.left.down = pressed;
	if (code === 'Escape') {
		if (interval) clearInterval(interval);
		resetSpecs();
	}
}

