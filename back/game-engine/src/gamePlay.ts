import { board, gameState, GameObject, whichSide } from "./gameSpecs.js";
import { playerKeys } from "./connectionHandler.js";

let paused = false;

export function updatePos(): void | number {
	if (paused) return;

	if (playerKeys.right.up)
		gameState.rightPaddle.y = Math.max(gameState.rightPaddle.y - gameState.speed.p, 0);
	if (playerKeys.right.down)
		gameState.rightPaddle.y = Math.min(gameState.rightPaddle.y + gameState.speed.p, board.CANVAS_HEIGHT - board.PADDLE_HEIGHT);
	if (playerKeys.left.up)
		gameState.leftPaddle.y = Math.max(gameState.leftPaddle.y - gameState.speed.p, 0);
	if (playerKeys.left.down)
		gameState.leftPaddle.y = Math.min(gameState.leftPaddle.y + gameState.speed.p, board.CANVAS_HEIGHT - board.PADDLE_HEIGHT);

	gameState.ball.x += gameState.speed.bX;
	gameState.ball.y += gameState.speed.bY;

	// reverse y direction when ball hits up or down walls
	if (gameState.ball.y - board.BALL_RADIUS / 2 <= 0 || gameState.ball.y + board.BALL_RADIUS / 2 >= board.CANVAS_HEIGHT)
		gameState.speed.bY *= -1;

	// bounce when ball hits paddel
	checkPaddelHit();

	// score when ball hits left or right walls
	if (gameState.ball.x - board.BALL_RADIUS / 2 <= 0 || gameState.ball.x + board.BALL_RADIUS / 2 >= board.CANVAS_WIDTH) {
		gameState.ball.x - board.BALL_RADIUS / 2 <= 0 ? gameState.score.right++ : gameState.score.left++;
		if (gameState.score.right >= 5 || gameState.score.left >= 5) {
			const rightWins = gameState.score.right >= 5;

			gameState.winner = rightWins
				? { alias: gameState.current.rightPlayer.alias, id: gameState.current.rightPlayer.id }
				: { alias: gameState.current.leftPlayer.alias, id: gameState.current.leftPlayer.id };

			gameState.loser = rightWins
				? { alias: gameState.current.leftPlayer.alias, id: gameState.current.leftPlayer.id }
				: { alias: gameState.current.rightPlayer.alias, id: gameState.current.rightPlayer.id };

			return 1;
		}
		serveBall();
	}
}

function checkPaddelHit() {
	// Left paddle
	if (gameState.ball.x - board.BALL_RADIUS / 2 <= gameState.leftPaddle.x + board.PADDLE_WIDTH &&
		gameState.ball.x - board.BALL_RADIUS / 2 >= gameState.leftPaddle.x &&
		gameState.ball.y + board.BALL_RADIUS / 2 >= gameState.leftPaddle.y &&
		gameState.ball.y - board.BALL_RADIUS / 2 <= gameState.leftPaddle.y + board.PADDLE_HEIGHT) {
		gameState.ball.x + gameState.leftPaddle.x + board.PADDLE_WIDTH + board.BALL_RADIUS / 2;

		const speed = Math.sqrt(gameState.speed.bX ** 2 + gameState.speed.bY ** 2);
		const newSpeed = speed * 1.04;

		//how far from the center the ball hit + dividing by (board.PADDLE_HEIGHT / 2) → normalize it to -1..1 to get direction
		const hitPos = (gameState.ball.y - (gameState.leftPaddle.y + board.PADDLE_HEIGHT / 2)) / (board.PADDLE_HEIGHT / 2);
		const maxAngle = 0.6; // max vertical component factor
		const angleFactor = hitPos * maxAngle;
		gameState.speed.bX = newSpeed * Math.sqrt(1 - angleFactor ** 2);
		gameState.speed.bY = newSpeed * angleFactor;
	}

	// Right paddle
	if (
		gameState.ball.x + board.BALL_RADIUS / 2 >= gameState.rightPaddle.x &&
		gameState.ball.x - board.BALL_RADIUS / 2 <= gameState.rightPaddle.x + board.PADDLE_WIDTH &&
		gameState.ball.y + board.BALL_RADIUS / 2 >= gameState.rightPaddle.y &&
		gameState.ball.y - board.BALL_RADIUS / 2 <= gameState.rightPaddle.y + board.PADDLE_HEIGHT) {
		gameState.ball.x = gameState.rightPaddle.x - board.BALL_RADIUS / 2; // prevent sticking
		// Paddle hit – calculate new speed and angle
		const speed = Math.sqrt(gameState.speed.bX ** 2 + gameState.speed.bY ** 2);
		const newSpeed = speed * 1.04;

		const hitPos = (gameState.ball.y - (gameState.rightPaddle.y + board.PADDLE_HEIGHT / 2)) / (board.PADDLE_HEIGHT / 2);
		const maxAngle = 0.6;
		const angleFactor = hitPos * maxAngle;

		const dir = -1; // ball moving left after hit
		gameState.speed.bX = newSpeed * Math.sqrt(1 - angleFactor ** 2) * dir;
		gameState.speed.bY = newSpeed * angleFactor;
	}
}

export async function serveBall() {
	gameState.ball.x = board.CANVAS_WIDTH / 2;
	gameState.ball.y = board.CANVAS_HEIGHT / 2;

	const angle = (30 + Math.random() * 30) * Math.PI / 180; // random 30°–60°
	const upDown = Math.random() < 0.5 ? 1 : -1;
	const direction = gameState.servingPlayer === 'left' ? 1 : -1;

	gameState.speed.bX = direction * board.BALL_SPEED_BASE * Math.cos(angle);
	gameState.speed.bY = upDown * board.BALL_SPEED_BASE * Math.sin(angle);

	gameState.servingPlayer = gameState.servingPlayer === 'left' ? 'right' : 'left';

	gameState.leftPaddle.y = board.CANVAS_HEIGHT / 2 - board.PADDLE_HEIGHT / 2;
	gameState.rightPaddle.y = board.CANVAS_HEIGHT / 2 - board.PADDLE_HEIGHT / 2;
	paused = true;
	await sleep(200);
	paused = false;
}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function resetSpecs(next: GameObject | -1) {

	if (next === -1 || next.matchId === -1) {
		console.log("no next game");
		gameState.current.leftPlayer = { alias: 'left', id: -1 };
		gameState.current.rightPlayer = { alias: 'right', id: -2 };
		gameState.current.matchId = -1;
		gameState.current.type = 'none';
	} else
		gameState.current = next;
	// Reset gameState to initial values
	gameState.ball.x = board.CANVAS_WIDTH / 2;
	gameState.ball.y = board.CANVAS_HEIGHT / 2;
	gameState.leftPaddle.y = board.CANVAS_HEIGHT / 2 - board.PADDLE_HEIGHT / 2;
	gameState.rightPaddle.y = board.CANVAS_HEIGHT / 2 - board.PADDLE_HEIGHT / 2;
	gameState.speed.bX = 0;
	gameState.speed.bY = 0;
	gameState.speed.p = 5;
	gameState.score.left = 0;
	gameState.score.right = 0;
	gameState.servingPlayer = whichSide();
	gameState.winner.id = -1;
	gameState.winner.alias = 'none';
	playerKeys.right.up = false;
	playerKeys.right.down = false;
	playerKeys.left.up = false;
	playerKeys.left.down = false;
}
