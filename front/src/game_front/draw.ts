import { gameState, board} from "./gameSpecs.js";



const COLORS = {
	BACKGROUND: '#000000',
    BALL: '#FFFFFF',
    PADDLE: '#FFFFFF',
    TEXT: '#FFFFFF',
    ACCENT: '#DB2777'
};


export function draw(canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return console.log('ctx failed to load inside startGame function');

	ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

	drawPaddlesAndBall(ctx);
	drawCenterLine(ctx);
	drawScore(ctx);
}

export function drawNumber(ctx: CanvasRenderingContext2D, n: number) {
   const x = board.CANVAS_WIDTH / 2;
    const y = board.CANVAS_HEIGHT / 2;

    ctx.fillStyle = '#000000';
    ctx.fillRect(x - 70, y - 70, 140, 140);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 120px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.toString(), x, y);
}

function drawPaddlesAndBall(ctx: CanvasRenderingContext2D) {
	ctx.fillStyle = COLORS.PADDLE;
    ctx.fillRect(gameState.leftPaddle.x, gameState.leftPaddle.y, board.PADDLE_WIDTH, board.PADDLE_HEIGHT);
    ctx.fillRect(gameState.rightPaddle.x, gameState.rightPaddle.y, board.PADDLE_WIDTH, board.PADDLE_HEIGHT);

    ctx.fillStyle = COLORS.BALL;
    ctx.beginPath();
	ctx.arc(gameState.ball.x, gameState.ball.y, board.BALL_RADIUS / 2, 0, Math.PI * 2);
	ctx.fill();
}

function drawCenterLine(ctx: CanvasRenderingContext2D) {
	ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 15]);

    ctx.beginPath();
    ctx.moveTo(board.CANVAS_WIDTH / 2, 0);
    ctx.lineTo(board.CANVAS_WIDTH / 2, board.CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawScore(ctx: CanvasRenderingContext2D) {
	ctx.fillStyle = 'white';
	ctx.font = '900 48px monospace';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';

	const leftStat = gameState.current.leftPlayer.alias.concat(" ", gameState.score.left.toString());
	const rightStat = gameState.current.rightPlayer.alias.concat(" ", gameState.score.right.toString());

	ctx.textAlign = 'right'
	ctx.fillText(leftStat, board.CANVAS_WIDTH / 2 - 50, 20);
	ctx.textAlign = 'left'
	ctx.fillText(rightStat, board.CANVAS_WIDTH / 2 + 50, 20);
}

export function drawText(canvas: HTMLCanvasElement, lines: string[]) {
	const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = '900 28px monospace';
    ctx.textAlign = 'center';

    lines.forEach((line, i) => {
        const textWidth = ctx.measureText(line.toUpperCase()).width;
        ctx.fillStyle = COLORS.ACCENT;
        ctx.fillRect(board.CANVAS_WIDTH / 2 - (textWidth/2) - 15, board.CANVAS_HEIGHT / 2 - 50 + (i * 50), textWidth + 30, 45);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(line.toUpperCase(), board.CANVAS_WIDTH / 2, board.CANVAS_HEIGHT / 2 - 15 + i * 50);
    });
}
