import { gameState, GameState, BoardConstants, board} from "./gameSpecs.js";
import { socket, showPlayMenu, waitForInput} from "./gameMenu.js"

const keys: Record<string, boolean> = {};
window.addEventListener('keydown', (e: KeyboardEvent) => { 
	//prevent page scrolling with arrow keys
	if (e.code === "ArrowUp" || e.code === "ArrowDown" ||
		e.code === "KeyW" || e.code === "KeyS" || e.code === 'Escape') e.preventDefault();
	if (!keys[e.code]) {
		keys[e.code] = true;
		sendKey(e.code, true)
	}});
window.addEventListener('keyup', (e: KeyboardEvent) => {
		if (keys[e.code]) {
		keys[e.code] = false;
		sendKey(e.code, false);
		}
	});

let frameID: number;


export async function startGame(overlay: HTMLElement, canvas: HTMLCanvasElement) {
	console.log('starting game');
	overlay.innerHTML = '';
	
	showInstructions(canvas);

	socket.addEventListener("message", (event) => {
	const message = JSON.parse(event.data);
	if (message.type === "go") {
		loop(overlay, canvas);
	}
	if (message.type === "state") {
		const getState: GameState = message.data;
		Object.assign(gameState, getState);
	}
});
		
	const readyBtn = document.createElement('button');
	readyBtn.textContent = 'READY';
	readyBtn.className = 'bg-blue-500 text-white text-2xl font-bold px-10 py-3 rounded hover:bg-blue-600 transition w-64';
	readyBtn.style.marginTop = '50px';
	readyBtn.onclick = () => {
		socket.send(JSON.stringify({ type: "ready" }));
		readyBtn.disabled = true;
		readyBtn.textContent = 'WAITING...';
		readyBtn.className = 'bg-gray-200 text-gray-400 text-2xl font-bold px-10 py-3 rounded w-64';
	};
	overlay.appendChild(readyBtn);

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

function sendKey(code: string, pressed: boolean) {
	if (socket.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify({ type: "input", data: { code, pressed }}));
	}
}

function loop(overlay: HTMLElement, canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return console.log('ctx failed to load inside loop function');

	draw(canvas);
	if (keys['Escape']) {
		stopGame(overlay, canvas);
		return;
	}
	frameID = requestAnimationFrame(() => loop(overlay, canvas));
}

function draw(canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return console.log('ctx failed to load inside startGame function');

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	ctx.fillStyle = 'white';
	ctx.fillRect(gameState.leftPaddle.x, gameState.leftPaddle.y, board.PADDLE_WIDTH, board.PADDLE_HEIGHT);
	ctx.fillStyle = 'white';
	ctx.fillRect(gameState.rightPaddle.x, gameState.rightPaddle.y, board.PADDLE_WIDTH, board.PADDLE_HEIGHT);
	ctx.fillStyle = 'white';
	ctx.beginPath();
	ctx.arc(gameState.ball.x, gameState.ball.y, board.BALL_RADIUS / 2, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = 'white';
	ctx.lineWidth = 5;
	ctx.setLineDash([10,10]);

	ctx.beginPath();
	ctx.moveTo(board.CANVAS_WIDTH / 2, 0);
	ctx.lineTo(board.CANVAS_WIDTH / 2, board.CANVAS_HEIGHT);
	ctx.stroke();
	ctx.setLineDash([]);

	ctx.fillStyle = 'white';
	ctx.font = 'bold 48px Courier';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';

	ctx.fillText(gameState.score.left.toString(), board.CANVAS_WIDTH / 2 - 100, 20);
	ctx.fillText(gameState.score.right.toString(), board.CANVAS_WIDTH / 2 + 100, 20);

}


function stopGame(overlay: HTMLElement, canvas: HTMLCanvasElement) {
	cancelAnimationFrame(frameID);

	const ctx = canvas.getContext('2d');
	if (!ctx) return console.log('ctx failed to load inside stopGame function');
	ctx.clearRect(0, 0, board.CANVAS_WIDTH, board.CANVAS_HEIGHT);

	overlay.style.display = 'flex';
	showPlayMenu(overlay, canvas);
}


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
			//ctx.clearRect(board.CANVAS_WIDTH / 2 - 50, board.CANVAS_HEIGHT / 2 - 50, 100, 100);
			
			drawNumber(ctx, count);

			count--;

			if (count < 0) {
				clearInterval(intervalId);
				callback();
			}
	}, 1000);
	});
}

export function drawNumber(ctx: CanvasRenderingContext2D, n: number) {
	ctx.clearRect(board.CANVAS_WIDTH /2 - 25, board.CANVAS_HEIGHT/2 - 25, 50, 50);
	ctx.fillStyle = 'white';
	ctx.font = 'bold 72px Courier';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(n.toString(), board.CANVAS_WIDTH / 2, board.CANVAS_HEIGHT / 2);
}

function showInstructions(canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return console.log('ctx failed to load inside shoInstructions function');
	
	ctx.fillStyle = 'white';
	ctx.font = 'bold 18px Courier';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	const lines = [
		"Use 'W' and 'S' keys for left paddle.", 
		"Use UP and DOWN arrows for right paddle.",
		"Press ESC to return to the menu"
	];
	lines.forEach((line, i) => {
		ctx.fillText(line, board.CANVAS_WIDTH / 2, board.CANVAS_HEIGHT / 2 - 80 + i * 30);
	})

}
