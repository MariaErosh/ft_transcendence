import { startGame, cleanup } from "./gamePlay.js";
import { board, BoardConstants } from "./gameSpecs.js";
import { disconnectGameWS, socket } from "../match_service/gameSocket.js";

// // export let socket: WebSocket;

// export function setupSocket(): Promise<void> {
// 	return new Promise((resolve, reject) => {
// 		// if (socket && socket.readyState === WebSocket.OPEN)
// 		// 	return resolve();

// 	// socket = new WebSocket("ws://localhost:3003/ws");
// 	socket!.addEventListener("open", () => {
// 			console.log("Game engine socket open");
// 			resolve();
// 		});

// 		socket!.addEventListener("message", (event) => {
// 			const message = JSON.parse(event.data);
// 			if (message.type === "start") {
// 				console.log("received start message from backend: ", message.data);
// 				const matchMenu = document.getElementById("match-menu");
// 				if (matchMenu) matchMenu.innerHTML = '';
// 				const gameBoard = document.getElementById('game-board-wrapper') as HTMLElement;
// 				if (gameBoard) {
// 					gameBoard.remove();
// 				}
// 				const container = document.getElementById('app') as HTMLElement;
// 				renderGameBoard(container);//PASS GAMEID AND TOCKEN HERE
// 				// const gameBoard = document.getElementById('game-board-wrapper') as HTMLElement;
// 				// if (gameBoard) {
// 				// 	const overlay = document.getElementById('overlay') as HTMLElement;
// 				// 	const canvas = document.getElementById('game-board') as HTMLCanvasElement;
// 				// 	startGame(overlay, canvas);
// 				// } else {
// 				// const container = document.getElementById('app') as HTMLElement;
// 				// renderGameBoard(container);
// 				// }
// 			}
// 		});

// 		socket.addEventListener("error", (err) => {
// 			console.error("Socket connection error:", err);
// 			reject(err);
// 		});
// 	});
// }

export async function renderGameBoard(container: HTMLElement) {

	if (!socket || socket.readyState !== WebSocket.OPEN) {
		throw new Error("Game socket not connected");
	  }
	// await setupSocket();
	console.log("waiting for board constants");
	const getConsts = await waitForInput<BoardConstants>("consts");
	Object.assign(board, getConsts);
	
	console.log("Received board constants:", board);
	// create wrapper for canvas + menu overlay
	const wrapper = document.createElement('div');
	wrapper.style.width = board.CANVAS_WIDTH + "px";
	wrapper.style.height = board.CANVAS_HEIGHT + "px";
	wrapper.className = "relative";
	wrapper.id = 'game-board-wrapper';
	container.appendChild(wrapper);
	

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

export function waitForInput<T>(expectedType: string): Promise<T> {
	return new Promise((resolve) => {

	if (!socket || socket.readyState !== WebSocket.OPEN) {
		throw new Error("Game socket not connected");
	  }
		socket.send(JSON.stringify({ type: expectedType }));
		socket.addEventListener("message", (event) => {
			const message = JSON.parse(event.data);
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
