import { gameState, GameState, board} from "./gameSpecs.js";
import { socket, showPlayMenu, waitForInput} from "./gameMenu.js"
import { draw, drawNumber, drawText } from "./draw.js";


let frameID: number;
const keys: Record<string, boolean> = {};
window.addEventListener('keydown', (e: KeyboardEvent) => { 
	//prevent page scrolling with arrow keys
	if (e.code === "ArrowUp" || e.code === "ArrowDown" ||
		e.code === "KeyW" || e.code === "KeyS" || e.code === 'Escape') e.preventDefault();
	if (!keys[e.code]) {
		keys[e.code] = true;
		sendKey(e.code, true); }});
window.addEventListener('keyup', (e: KeyboardEvent) => {
	if (keys[e.code]) {
		keys[e.code] = false;
		sendKey(e.code, false); }});

function sendKey(code: string, pressed: boolean) {
	if (socket.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify({ type: "input", data: { code, pressed }}));
	}
}

export async function startGame(overlay: HTMLElement, canvas: HTMLCanvasElement) {
	// console.log('starting game');
	// overlay.innerHTML = '';
	
	// const instructions = [
	// 	"Use 'W' and 'S' keys for left paddle.", 
	// 	"Use UP and DOWN arrows for right paddle.",
	// 	"Press ESC to return to the menu"
	// ];
	// drawText(canvas, instructions);

	showInstructions(overlay, canvas);

	socket.addEventListener("message", (event) => {
	const message = JSON.parse(event.data);
	if (message.type === "go") {
		loop(overlay, canvas);
	}
	if (message.type === "state" || message.type === "win") {
		const getState: GameState = message.data;
		Object.assign(gameState, getState);
		if (message.type === "win") {
			draw(canvas);
			cancelAnimationFrame(frameID);
			overlay.style.display = 'flex';
			const winner = ["THE WINNER IS ", gameState.winner.alias];
			drawText(canvas, winner);

			overlay.innerHTML = '';
			const nextBtn = document.createElement('button');
			nextBtn.textContent = 'READY FOR NEXT GAME';
			nextBtn.className = 'bg-blue-500 text-white text-2xl font-bold px-10 py-3 rounded hover:bg-blue-600 transition w-64';
			nextBtn.style.marginTop = '200px';
			nextBtn.onclick = () => {
				// socket.send(JSON.stringify({ type: "ready" }));
				startGame(overlay, canvas);
			};
			overlay.appendChild(nextBtn);
			}
	}
	});
		
	// const readyBtn = document.createElement('button');
	// readyBtn.textContent = 'READY';
	// readyBtn.className = 'bg-blue-500 text-white text-2xl font-bold px-10 py-3 rounded hover:bg-blue-600 transition w-64';
	// readyBtn.style.marginTop = '200px';
	// readyBtn.onclick = () => {
	// 	socket.send(JSON.stringify({ type: "ready" }));
	// 	readyBtn.disabled = true;
	// 	readyBtn.textContent = 'WAITING...';
	// 	readyBtn.className = 'bg-gray-200 text-gray-400 text-2xl font-bold px-10 py-3 rounded w-64';
	// };
	// overlay.appendChild(readyBtn);

	const getState = await waitForInput<GameState>("set");
	Object.assign(gameState, getState);
	overlay.style.display = 'none';
	draw(canvas);
	startCountdown(3, canvas, () => {
		socket.send(JSON.stringify({ type: "please serve" }));
	});


	socket.addEventListener("close", (event) => {
		console.warn(`Socket closed: code=${event.code}, reason=${event.reason || "no reason"}`);
		alert("Connection to the game server was lost.");
	});

	socket.addEventListener("error", (event) => {
		console.error("WebSocket encountered an error:", event);
	});
}	

function showInstructions(overlay: HTMLElement, canvas: HTMLCanvasElement) {
	console.log('starting game');
	overlay.innerHTML = '';
	
	const ctx = canvas.getContext('2d');
	if (!ctx) return console.log('ctx failed to load inside showInstructions function');
	ctx.clearRect(0, 0, board.CANVAS_HEIGHT, board.CANVAS_WIDTH);
	const instructions = [
		"Use 'W' and 'S' keys for left paddle.", 
		"Use UP and DOWN arrows for right paddle.",
		"Press ESC to return to the menu"
	];
	drawText(canvas, instructions);

	const readyBtn = document.createElement('button');
	readyBtn.textContent = 'READY';
	readyBtn.className = 'bg-blue-500 text-white text-2xl font-bold px-10 py-3 rounded hover:bg-blue-600 transition w-64';
	readyBtn.style.marginTop = '200px';
	readyBtn.onclick = () => {
		socket.send(JSON.stringify({ type: "ready" }));
		readyBtn.disabled = true;
		readyBtn.textContent = 'WAITING...';
		readyBtn.className = 'bg-gray-200 text-gray-400 text-2xl font-bold px-10 py-3 rounded w-64';
	};
	overlay.appendChild(readyBtn);

}
function loop(overlay: HTMLElement, canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return console.log('ctx failed to load inside loop function');

	draw(canvas);
	if (keys['Escape']) {
		cancelAnimationFrame(frameID);
		ctx.clearRect(0, 0, board.CANVAS_WIDTH, board.CANVAS_HEIGHT);
		showPlayMenu(overlay, canvas);
		return;
	}
	frameID = requestAnimationFrame(() => loop(overlay, canvas));
}

// function stopGame(overlay: HTMLElement, canvas: HTMLCanvasElement) {
	

// 	const ctx = canvas.getContext('2d');
// 	if (!ctx) return console.log('ctx failed to load inside stopGame function');
// 	ctx.clearRect(0, 0, board.CANVAS_WIDTH, board.CANVAS_HEIGHT);

// 	overlay.style.display = 'flex';
// }


function startCountdown(count: number, canvas: HTMLCanvasElement, callback: () => void) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return console.log('ctx failed to load inside startCountdown function');

	requestAnimationFrame(() => {
		draw(canvas);
		drawNumber(ctx, count);
		count--;

		const intervalId = setInterval(() => {
			ctx.clearRect(0, 0, board.CANVAS_WIDTH, board.CANVAS_HEIGHT);
			draw(canvas);			
			drawNumber(ctx, count);

			count--;
			if (count < 0) {
				clearInterval(intervalId);
				callback();
			}
	}, 1000);
	});
}
