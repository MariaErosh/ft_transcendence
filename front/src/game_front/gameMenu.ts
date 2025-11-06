import { startGame } from "./gamePlay.js";
import { board, BoardConstants } from "./gameSpecs.js";

// export const socket = new WebSocket("ws://localhost:3003/ws");
// socket.onopen = () => {
// 	console.log('Game-engine socket open');
// };

export let socket: WebSocket;
let boardPromise: Promise<BoardConstants> | null = null;

export function connectEngine(): Promise<BoardConstants> {
	if (boardPromise) return boardPromise; // reuse the same promise if already connecting

	boardPromise = new Promise((resolve, reject) => {
		socket = new WebSocket("ws://localhost:3003/ws");

		socket.addEventListener("open", () => {
			console.log("Game engine socket open");
		});

		socket.addEventListener("message", (event) => {
			const message = JSON.parse(event.data);
			if (message.type === "consts") {
				console.log("received consts from backend");
				resolve(message.data);
			}
		});

		socket.addEventListener("error", (err) => {
			console.error("Socket connection error:", err);
			reject(err);
		});

		// socket.addEventListener("close", () => {
		// 	console.warn("Socket closed");
		// });
	});

	return boardPromise;
}

export async function renderGameBoard(container: HTMLElement) {
	//container.innerHTML = '';

	console.log("waiting for board constants");
	//const getConsts = await waitForInput<BoardConstants>("consts");
	const getConsts = await connectEngine();
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
	wrapper.appendChild(overlay);

	startGame(overlay, canvas);

}

export function waitForInput<T>(expectedType: string): Promise<T> {
	return new Promise((resolve) => {
		socket.addEventListener("message", (event) => {
			const message = JSON.parse(event.data);
			if (message.type === expectedType) {
				console.log('receiving input with type ', expectedType);
				resolve(message.data as T);
			}
		}, { once: true }); // makes sure listener only runs once
	});
}

export function disconnectEngine() {
	if (socket && socket.readyState === WebSocket.OPEN) {
		socket.close();
	}
	socket = null as any;
	boardPromise = null;
}



// export function showPlayMenu(overlay: HTMLElement, canvas: HTMLCanvasElement) {
// 	overlay.innerHTML = '';
// 	overlay.style.display = 'flex';

	
// 	const menu = document.createElement('div');
// 	menu.className = 'flex flex-col gap-4 items-center';

// 	const playBtn = document.createElement('button');
// 	playBtn.textContent = 'PLAY PONG';
// 	playBtn.className = 'bg-red-500 text-white text-3xl font-bold px-12 py-4 rounded hover:bg-red-600 transition';
// 	playBtn.onclick = () => {
// 		showGameMenu(overlay, canvas);
// 	};
// 	menu.appendChild(playBtn);
// 	overlay.appendChild(menu);
// }

// function showGameMenu(overlay: HTMLElement, canvas: HTMLCanvasElement) {
// 	overlay.innerHTML = '';

// 	const menu = document.createElement('div');
// 	menu.className = 'flex flex-col gap-4 items-center';
	
// 	const title = document.createElement('h2');
// 	title.textContent = 'SELECT MODE';
// 	title.className = 'text-white text-4xl font-bold mb-6';
// 	menu.appendChild(title);

// 	// Select Options Button: WILL BE REPLACED LATER WITH GAME MANAGEMENT LOGIC
// 	const selectOptionsBtn = document.createElement('button');
// 	selectOptionsBtn.textContent = 'SELECT OPTIONS';
// 	selectOptionsBtn.className = 'bg-blue-500 text-white text-2xl font-bold px-10 py-3 rounded hover:bg-blue-600 transition w-64';
// 	selectOptionsBtn.onclick = () => {
// 		// Enable start button
// 		startGameBtn.disabled = false;
// 		startGameBtn.className = 'bg-green-500 text-white text-2xl font-bold px-10 py-3 rounded hover:bg-green-600 transition w-64 cursor-pointer';
// 		startGameBtn.onclick = () => {
// 			startGame(overlay, canvas);
// 		};
// 	};
// 	menu.appendChild(selectOptionsBtn);

// 	// Start Game Button (initially disabled, will enable when options are selected) 
// 	const startGameBtn = document.createElement('button');
// 	startGameBtn.textContent = 'START GAME';
// 	startGameBtn.className = 'bg-gray-400 text-gray-600 text-2xl font-bold px-10 py-3 rounded w-64 cursor-not-allowed';
// 	startGameBtn.disabled = true;
// 	menu.appendChild(startGameBtn);

// 	overlay.appendChild(menu);
// }
