import { gameState, board} from "./gameSpecs.js";


export function draw(canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return console.log('ctx failed to load inside startGame function');

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	drawPaddelsAndBall(ctx);
	drawCenterLine(ctx);
	drawScore(ctx);
}

export function drawNumber(ctx: CanvasRenderingContext2D, n: number) {
	ctx.clearRect(board.CANVAS_WIDTH /2 - 25, board.CANVAS_HEIGHT/2 - 25, 50, 50);
	ctx.fillStyle = 'white';
	ctx.font = 'bold 72px Courier';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(n.toString(), board.CANVAS_WIDTH / 2, board.CANVAS_HEIGHT / 2);
}

function drawPaddelsAndBall(ctx: CanvasRenderingContext2D) {
	ctx.fillStyle = 'white';
	ctx.fillRect(gameState.leftPaddle.x, gameState.leftPaddle.y, board.PADDLE_WIDTH, board.PADDLE_HEIGHT);
	ctx.fillStyle = 'white';
	ctx.fillRect(gameState.rightPaddle.x, gameState.rightPaddle.y, board.PADDLE_WIDTH, board.PADDLE_HEIGHT);
	ctx.fillStyle = 'white';
	ctx.beginPath();
	ctx.arc(gameState.ball.x, gameState.ball.y, board.BALL_RADIUS / 2, 0, Math.PI * 2);
	ctx.fill();
}

function drawCenterLine(ctx: CanvasRenderingContext2D) {
	ctx.strokeStyle = 'white';
	ctx.lineWidth = 5;
	ctx.setLineDash([10,10]);

	ctx.beginPath();
	ctx.moveTo(board.CANVAS_WIDTH / 2, 0);
	ctx.lineTo(board.CANVAS_WIDTH / 2, board.CANVAS_HEIGHT);
	ctx.stroke();
	ctx.setLineDash([]);
}

function drawScore(ctx: CanvasRenderingContext2D) {
	ctx.fillStyle = 'white';
	ctx.font = 'bold 48px Courier';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';

	ctx.fillText(gameState.score.left.toString(), board.CANVAS_WIDTH / 2 - 100, 20);
	ctx.fillText(gameState.score.right.toString(), board.CANVAS_WIDTH / 2 + 100, 20);
}

export function drawText(canvas: HTMLCanvasElement, lines: string[]) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return console.log('ctx failed to load inside shoInstructions function');
	
	ctx.clearRect(board.CANVAS_WIDTH/ 2 - 100, board.CANVAS_HEIGHT/ 2 - 50, 200, 100);
	ctx.fillStyle = 'white';
	ctx.font = 'bold 18px Courier';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	// const lines = [
	// 	"Use 'W' and 'S' keys for left paddle.", 
	// 	"Use UP and DOWN arrows for right paddle.",
	// 	"Press ESC to return to the menu"
	// ];
	lines.forEach((line, i) => {
		ctx.fillText(line, board.CANVAS_WIDTH / 2, board.CANVAS_HEIGHT / 2 - 30 + i * 30);
	})

}
