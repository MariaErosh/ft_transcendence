import { BALL_RADIUS, CANVAS_HEIGHT, CANVAS_WIDTH, PADDLE_HEIGHT, PADDLE_WIDTH, BALL_SPEED_BASE,
	gameState} from "./gameSpecs.js";
import { showPlayMenu } from "./gameMenu.js"

const key: Record<string, boolean> = {};
window.addEventListener('keydown', (e: KeyboardEvent) => { 
	//prevent page scrolling with arrow keys
	if (e.code === "ArrowUp" || e.code === "ArrowDown" ||
		e.code === "KeyW" || e.code === "KeyS" || e.code === 'Escape') e.preventDefault();
	key[e.code] = true;});
window.addEventListener('keyup', (e: KeyboardEvent) => { key[e.code] = false; });

let frameID: number;

export function startGame(overlay: HTMLElement, canvas: HTMLCanvasElement) {
	console.log('starting game');
	// overlay.innerHTML = '';
	overlay.style.display = 'none';

	serveBall();
	draw(canvas);

	function frame(now: number) {
		if (key['Escape'])
		{
			stopGame(overlay, canvas);
			return;
		}
		if (key['ArrowUp'])
			gameState.rightPaddle.y = Math.max(gameState.rightPaddle.y - gameState.speed.p, 0);
		if (key['ArrowDown'])
			gameState.rightPaddle.y = Math.min(gameState.rightPaddle.y + gameState.speed.p, CANVAS_HEIGHT - PADDLE_HEIGHT);
		if (key['KeyW'])
			gameState.leftPaddle.y = Math.max(gameState.leftPaddle.y - gameState.speed.p, 0);
		if (key['KeyS'])
			gameState.leftPaddle.y = Math.min(gameState.leftPaddle.y + gameState.speed.p, CANVAS_HEIGHT - PADDLE_HEIGHT);
		gameState.ball.x += gameState.speed.bX;
		gameState.ball.y += gameState.speed.bY;

		// reverse y direction when ball hits up or down walls
		if (gameState.ball.y - BALL_RADIUS / 2 <= 0 || gameState.ball.y + BALL_RADIUS / 2 >= CANVAS_HEIGHT)
			gameState.speed.bY *= -1;
		

		// bounce when ball hits paddel
		checkPaddelHit();

		// score when ball hits left or right walls 
		if (gameState.ball.x - BALL_RADIUS / 2 <= 0 || gameState.ball.x + BALL_RADIUS / 2 >= CANVAS_WIDTH)
		{
			gameState.ball.x - BALL_RADIUS / 2 <= 0 ? gameState.score.right++ : gameState.score.left++;
			serveBall();
		}
			
		draw(canvas);
		frameID = requestAnimationFrame(frame);
	}
	frameID = requestAnimationFrame(frame);
}

function checkPaddelHit() {
	// Left paddle
	if (gameState.ball.x - BALL_RADIUS / 2 <= gameState.leftPaddle.x + PADDLE_WIDTH &&
		gameState.ball.x - BALL_RADIUS / 2 >= gameState.leftPaddle.x &&
		gameState.ball.y + BALL_RADIUS / 2 >= gameState.leftPaddle.y &&
		gameState.ball.y - BALL_RADIUS / 2 <= gameState.leftPaddle.y + PADDLE_HEIGHT) 
	{
		gameState.ball.x + gameState.leftPaddle.x + PADDLE_WIDTH + BALL_RADIUS / 2;
		
		const speed = Math.sqrt(gameState.speed.bX**2 + gameState.speed.bY**2);
		const newSpeed = speed * 1.03;

		//how far from the center the ball hit + dividing by (PADDLE_HEIGHT / 2) → normalize it to -1..1 to get direction 
		const hitPos = (gameState.ball.y - (gameState.leftPaddle.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
		const maxAngle = 0.6; // max vertical component factor
		const angleFactor = hitPos * maxAngle;
		gameState.speed.bX = newSpeed * Math.sqrt(1 - angleFactor ** 2);
		gameState.speed.bY = newSpeed * angleFactor;
	}

	// Right paddle
	if (
		gameState.ball.x + BALL_RADIUS / 2 >= gameState.rightPaddle.x &&
		gameState.ball.x - BALL_RADIUS / 2 <= gameState.rightPaddle.x + PADDLE_WIDTH &&
		gameState.ball.y + BALL_RADIUS / 2 >= gameState.rightPaddle.y &&
		gameState.ball.y - BALL_RADIUS / 2 <= gameState.rightPaddle.y + PADDLE_HEIGHT)
	{
		gameState.ball.x = gameState.rightPaddle.x - BALL_RADIUS / 2; // prevent sticking
		 // Paddle hit – calculate new speed and angle
		const speed = Math.sqrt(gameState.speed.bX**2 + gameState.speed.bY**2);
		const newSpeed = speed * 1.03;

		const hitPos = (gameState.ball.y - (gameState.rightPaddle.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
		const maxAngle = 0.6;
		const angleFactor = hitPos * maxAngle;

		const dir = -1; // ball moving left after hit
		gameState.speed.bX = newSpeed * Math.sqrt(1 - angleFactor ** 2) * dir;
		gameState.speed.bY = newSpeed * angleFactor;
	}
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

	ctx.strokeStyle = 'white';
	ctx.lineWidth = 5;
	ctx.setLineDash([10,10]);

	ctx.beginPath();
	ctx.moveTo(CANVAS_WIDTH / 2, 0);
	ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
	ctx.stroke();
	ctx.setLineDash([]);

	ctx.fillStyle = 'white';
	ctx.font = 'bold 48px Courier';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';

	ctx.fillText(gameState.score.left.toString(), CANVAS_WIDTH / 4, 20);
	ctx.fillText(gameState.score.right.toString(), 3 * canvas.width / 4, 20);

}


function serveBall() {
	gameState.ball.x = CANVAS_WIDTH / 2;
    	gameState.ball.y = CANVAS_HEIGHT / 2;

	const angle = (30 + Math.random() * 30) * Math.PI / 180; // random 30°–60°
	const upDown = Math.random() < 0.5 ? 1 : -1;
	const direction = gameState.servingPlayer === 'left' ? 1 : -1;

	gameState.speed.bX = direction * BALL_SPEED_BASE * Math.cos(angle);
    	gameState.speed.bY = upDown * BALL_SPEED_BASE  * Math.sin(angle);

	gameState.servingPlayer = gameState.servingPlayer === 'left' ? 'right' : 'left';
}


function stopGame(overlay: HTMLElement, canvas: HTMLCanvasElement) {
	cancelAnimationFrame(frameID);

	// Reset gameState to initial values
	gameState.ball.x = CANVAS_WIDTH / 2;
	gameState.ball.y = CANVAS_HEIGHT / 2;
	gameState.leftPaddle.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
	gameState.rightPaddle.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
	gameState.speed.bX = 0;
	gameState.speed.bY = 0;
	gameState.speed.p = 5;
	gameState.score.left = 0;
	gameState.score.right = 0;
	gameState.servingPlayer = 'left';

	const ctx = canvas.getContext('2d');
	if (!ctx) return console.log('ctx failed to load inside stopGame function');
	ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

	overlay.style.display = 'flex';
	showPlayMenu(overlay, canvas);
}
