import { BALL_RADIUS, PADDLE_HEIGHT, PADDLE_WIDTH, gameState} from "./gameSpecs.js";

const key: Record<string, boolean> = {};
window.addEventListener('keydown', (e: KeyboardEvent) => { 
	//prevent page scrolling with arrow keys
	if (e.code === "ArrowUp" || e.code === "ArrowDown") e.preventDefault();
	key[e.code] = true; });
window.addEventListener('keyup', (e: KeyboardEvent) => { key[e.code] = false; });

export function startGame(overlay: HTMLElement, canvas: HTMLCanvasElement) {
	console.log('starting game');
	// overlay.innerHTML = '';
	overlay.style.display = 'none';

	draw(canvas);

	function frame(now: number) {
		if (key['ArrowUp'])
			gameState.rightPaddle.y -= 5;
		if (key['ArrowDown'])
			gameState.rightPaddle.y += 5;
		draw(canvas);
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
}


function draw(canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return console.log('ctx failed to load inside startGame function');

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = 'white';
	ctx.fillRect(gameState.leftPaddle.x, gameState.leftPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
	ctx.fillStyle = 'white';
	ctx.fillRect(gameState.rightPaddle.x, gameState.rightPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
	ctx.fillStyle = 'white';
	ctx.beginPath();
	ctx.arc(gameState.ball.x, gameState.ball.y, BALL_RADIUS / 2, 0, Math.PI * 2);
	ctx.fill();
	
}
