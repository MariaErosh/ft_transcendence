import { startGame, cleanup } from "./gamePlay.js";
import { board, BoardConstants } from "./gameSpecs.js";

export let engineSocket: WebSocket;
export let defGameId: number = 111;
export let defToken: string = 'token';

export function setupEngineSocket(gameId: number, token: string): Promise<void> {
	return new Promise((resolve, reject) => {
		if (engineSocket && engineSocket.readyState === WebSocket.OPEN)
			engineSocket.close();

	engineSocket = new WebSocket(`ws://localhost:3000/game/ws?gameId=${gameId}&token=${token}`);
	engineSocket.addEventListener("open", () => {
			console.log("Game engine socket open for match with id: ", gameId);
			resolve();
		});

		engineSocket.addEventListener("message", (event) => {
			const message = JSON.parse(event.data);
			console.log("message received through engine websocket: ", message.data);
			
		});

		engineSocket.addEventListener("error", (err) => {
			console.error("Socket connection error:", err);
			reject(err);
		});
	});
}

export function readyToRender(gameId: any) {
	const matchMenu = document.getElementById("match-menu");
	if (matchMenu) matchMenu.innerHTML = '';
	const gameBoard = document.getElementById('game-board-wrapper') as HTMLElement;
	if (gameBoard) {
		gameBoard.remove();
	}
	const container = document.getElementById('app') as HTMLElement;
	renderGameBoard(container, gameId);
}
				

export async function renderGameBoard(container: HTMLElement, gameId: any) {

	await setupEngineSocket(gameId, defToken);
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
		engineSocket.send(JSON.stringify({ type: expectedType }));
		engineSocket.addEventListener("message", (event) => {
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
    return new Promise<void>((resolve) => {
        if (engineSocket && engineSocket.readyState !== WebSocket.CLOSED) {
            engineSocket.addEventListener("close", () => {
               // console.log("old socket closed");
                setupEngineSocket(defGameId, defToken).then(resolve);
            }, { once: true });
            engineSocket.close();
        } else {
            // If already closed, just setup a new one
            setupEngineSocket(defGameId, defToken).then(resolve);
        }
    });
}
