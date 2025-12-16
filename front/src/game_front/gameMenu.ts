import { startGame } from "./gamePlay.js";
import { board } from "./gameSpecs.js";
import { gameSocket } from "../match_service/gameSocket.js";

export async function renderGameBoard() {
	const main = document.getElementById("main")!;
	main.innerHTML = "";
	history.pushState({ view:"game"}, "", "game");

	const exist = document.getElementById("game-board-wrapper");
	if (exist) exist.remove();
	const arena = document.getElementById("arena");
	if (arena) arena.remove();

	if (!gameSocket || gameSocket.readyState !== WebSocket.OPEN)
		throw new Error("Game socket not connected");

	const wrapper = document.createElement('div');
	wrapper.id = 'game-board-wrapper';
	wrapper.className = `
		relative p-4 bg-gray-200
		border-8 border-black
		shadow-[20px_20px_0_0_#000000]
		flex flex-col items-center
	`;
	main.appendChild(wrapper);

	//creating canvas
	const canvas = document.createElement('canvas');
	canvas.id = 'game-board';
	canvas.width = board.CANVAS_WIDTH;
	canvas.height =  board.CANVAS_HEIGHT;
	canvas.className = 'border-4 border-black bg-black';
	wrapper.appendChild(canvas);

	const overlay = document.createElement('div');
	overlay.className = 'absolute inset-0 bg-purple-600/40 backdrop-blur-sm flex items-center justify-center font-mono text-4xl font-black text-white uppercase';
	overlay.style.display = "none";
	overlay.id = 'overlay';
	wrapper.appendChild(overlay);

	startGame(overlay, canvas);
}

export function waitForInput<T>(expectedType: string): Promise<T> {
	return new Promise((resolve) => {

	function sendRequest() {
		gameSocket?.send(JSON.stringify({ type: expectedType }));
	}
	if (gameSocket?.readyState !== WebSocket.OPEN) {
		gameSocket?.addEventListener("open", sendRequest, {once: true});
	  } else {
		sendRequest();
	  }
	gameSocket?.addEventListener("message", async (event) => {
		let rawData: string;
		if (event.data instanceof Blob) {
			rawData = await event.data.text();
		} else {
			rawData = event.data.toString();
		}
		const message = JSON.parse(rawData);
		if (message.type === expectedType) {
			console.log('receiving input with type ', expectedType);
			resolve(message.data as T);
		}
	}, { once: true }); // makes sure listener only runs once
	});
}
