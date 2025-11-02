import { startGame } from "./gamePlay.js";
import { board, BoardConstants } from "./gameSpecs.js";

export const socket = new WebSocket("ws://localhost:3003");
socket.onopen = () => {
	console.log('Game-engine socket open');
};

export async function renderGameBoard(container: HTMLElement) {

	console.log("waiting for board constants");
	const getConsts = await waitForInput<BoardConstants>("consts");
	Object.assign(board, getConsts);
	
	// create wrapper for canvas + menu overlay
	const wrapper = document.createElement('div');
	wrapper.className = `relative w-[${board.CANVAS_WIDTH}px] [${board.CANVAS_HEIGHT}px]`;
	
	//creating canvas
	const canvas = document.createElement('canvas');
	canvas.id = 'game-board';
	canvas.width = board.CANVAS_WIDTH;
	canvas.height =  board.CANVAS_HEIGHT;
	canvas.className = 'rounded';
	canvas.style.backgroundColor = 'black';
	wrapper.appendChild(canvas);

	const ctx = canvas.getContext('2d');
	if (!ctx) return console.log("ctx failed to load inside renderGameBoard function");

	// menu overlay
	const playMenu = document.createElement('div');
	playMenu.id = 'play-menu';
	playMenu.className = 'absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center rounded';

	// create initial menu
	showPlayMenu(playMenu, canvas);

	wrapper.appendChild(playMenu);
	container.appendChild(wrapper);

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


export function showPlayMenu(overlay: HTMLElement, canvas: HTMLCanvasElement) {
	overlay.innerHTML = '';
	overlay.style.display = 'flex';

	
	const menu = document.createElement('div');
	menu.className = 'flex flex-col gap-4 items-center';

	const playBtn = document.createElement('button');
	playBtn.textContent = 'PLAY PONG';
	playBtn.className = 'bg-red-500 text-white text-3xl font-bold px-12 py-4 rounded hover:bg-red-600 transition';
	playBtn.onclick = () => {
		showGameMenu(overlay, canvas);
	};
	menu.appendChild(playBtn);
	overlay.appendChild(menu);
}

function showGameMenu(overlay: HTMLElement, canvas: HTMLCanvasElement) {
	overlay.innerHTML = '';

	const menu = document.createElement('div');
	menu.className = 'flex flex-col gap-4 items-center';
	
	const title = document.createElement('h2');
	title.textContent = 'SELECT MODE';
	title.className = 'text-white text-4xl font-bold mb-6';
	menu.appendChild(title);

	// Select Options Button: WILL BE REPLACED LATER WITH GAME MANAGEMENT LOGIC
	const selectOptionsBtn = document.createElement('button');
	selectOptionsBtn.textContent = 'SELECT OPTIONS';
	selectOptionsBtn.className = 'bg-blue-500 text-white text-2xl font-bold px-10 py-3 rounded hover:bg-blue-600 transition w-64';
	selectOptionsBtn.onclick = () => {
		// Enable start button
		startGameBtn.disabled = false;
		startGameBtn.className = 'bg-green-500 text-white text-2xl font-bold px-10 py-3 rounded hover:bg-green-600 transition w-64 cursor-pointer';
		startGameBtn.onclick = () => {
			startGame(overlay, canvas);
		};
	};
	menu.appendChild(selectOptionsBtn);

	// Start Game Button (initially disabled, will enable when options are selected) 
	const startGameBtn = document.createElement('button');
	startGameBtn.textContent = 'START GAME';
	startGameBtn.className = 'bg-gray-400 text-gray-600 text-2xl font-bold px-10 py-3 rounded w-64 cursor-not-allowed';
	startGameBtn.disabled = true;
	menu.appendChild(startGameBtn);

	overlay.appendChild(menu);
}
