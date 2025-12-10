import { startGame, cleanup } from "./gamePlay.js";
import { board, BoardConstants, gameState, GameState } from "./gameSpecs.js";
import { disconnectGameWS, gameSocket } from "../match_service/gameSocket.js";

export function readyToRender(gameId: any) {
	const matchMenu = document.getElementById("match-menu");
	if (matchMenu) matchMenu.innerHTML = '';
	const gameBoard = document.getElementById('game-board-wrapper') as HTMLElement;
	if (gameBoard) {
		gameBoard.remove();
	}
	renderGameBoard();
}

export async function renderGameBoard() {
	const main = document.getElementById("main")!;
	main.innerHTML = "";
	history.pushState({ view:"game"}, "", "game");

	const exist = document.getElementById("game-board-wrapper");
	if (exist) exist.remove();
	const arena = document.getElementById("arena");
	if (arena) arena.remove();

	if (!gameSocket || gameSocket.readyState !== WebSocket.OPEN) {
		throw new Error("Game socket not connected");
	  }
	// await setupEngineSocket(gameId, defToken);
	console.log("waiting for board constants");
	
	function getReady(event: MessageEvent) {
	//gameSocket.addEventListener("message", function getReady(event) => {
		const message = JSON.parse(event.data);
		if (message.type === "ready") {
			Object.assign(board, message.data.board);
			Object.assign(gameState, message.data.gameState);
	
			gameSocket?.removeEventListener("message", getReady);

		
			const wrapper = document.createElement('div');
			wrapper.style.width = board.CANVAS_WIDTH + "px";
			wrapper.style.height = board.CANVAS_HEIGHT + "px";
			wrapper.className = "relative";
			wrapper.id = 'game-board-wrapper';
			main.appendChild(wrapper);
			

			//creating canvas
			const canvas = document.createElement('canvas');
			canvas.id = 'game-board';
			canvas.width = board.CANVAS_WIDTH;
			canvas.height =  board.CANVAS_HEIGHT;
			canvas.className = 'rounded';
			//canvas.style.display = "block"; // prevents inline canvas from collapsing
			canvas.style.backgroundColor = 'black';
			wrapper.appendChild(canvas);

			const overlay = document.createElement('div');
			overlay.style.position = 'absolute';
			overlay.style.inset = '0';
			overlay.className = 'absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded';
			overlay.style.display = "none";
			overlay.id = 'overlay';
			wrapper.appendChild(overlay);

			startGame(overlay, canvas);
		}
	}
	gameSocket?.addEventListener("message", getReady);
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

// export function disconnectEngine() {
// 	if (socket && socket.readyState === WebSocket.OPEN) {
// 		socket.close();
// 	}
// 	socket = null as any;
// 	boardPromise = null;
// }

export async function disconnectEngine() {
    // return new Promise<void>((resolve) => {
    //     if (socket && socket.readyState !== WebSocket.CLOSED) {
    //         socket.addEventListener("close", () => {
    //            // console.log("old socket closed");
    //             setupSocket().then(resolve);
    //         }, { once: true });
    //         socket.close();
    //     } else {
    //         // If already closed, just setup a new one
    //         setupSocket().then(resolve);
    //     }
    // });
	disconnectGameWS();
}
