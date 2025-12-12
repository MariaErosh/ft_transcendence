import { gameState, board} from "./gameSpecs.js";



const COLORS = {
	BACKGROUND: '#000000', // Back to Black for maximum focus
    BALL: '#FFFFFF',       // White Ball for contrast
    PADDLE: '#FFFFFF',     // White Paddles
    TEXT: '#FFFFFF',       // White Text
    ACCENT: '#DB2777'      // Keeping Pink as the highlight color
};


export function draw(canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return console.log('ctx failed to load inside startGame function');

	ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

	drawPaddelsAndBall(ctx);
	drawCenterLine(ctx);
	drawScore(ctx);
}

export function drawNumber(ctx: CanvasRenderingContext2D, n: number) {
	const x = board.CANVAS_WIDTH / 2;
    const y = board.CANVAS_HEIGHT / 2;

    // Use a Bright Accent Box so the countdown is impossible to miss
    ctx.fillStyle = COLORS.ACCENT;
    ctx.fillRect(x - 60, y - 60, 120, 120);

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.strokeRect(x - 60, y - 60, 120, 120);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 80px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.toString(), x, y);
}

function drawPaddelsAndBall(ctx: CanvasRenderingContext2D) {
	ctx.fillStyle = COLORS.PADDLE;
    ctx.fillRect(gameState.leftPaddle.x, gameState.leftPaddle.y, board.PADDLE_WIDTH, board.PADDLE_HEIGHT);
    ctx.fillRect(gameState.rightPaddle.x, gameState.rightPaddle.y, board.PADDLE_WIDTH, board.PADDLE_HEIGHT);

    ctx.fillStyle = COLORS.BALL;
    ctx.beginPath();
	ctx.arc(gameState.ball.x, gameState.ball.y, board.BALL_RADIUS / 2, 0, Math.PI * 2);
	ctx.fill();
}

function drawCenterLine(ctx: CanvasRenderingContext2D) {
	ctx.strokeStyle = '#333333'; // Dark Gray so it doesn't distract from the white ball
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 15]);

    ctx.beginPath();
    ctx.moveTo(board.CANVAS_WIDTH / 2, 0);
    ctx.lineTo(board.CANVAS_WIDTH / 2, board.CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawScore(ctx: CanvasRenderingContext2D) {
	ctx.fillStyle = COLORS.TEXT;
    ctx.font = '900 48px monospace';
    ctx.textBaseline = 'top';

    // Simplified for quick reading during gameplay
    const leftScore = gameState.score.left.toString();
    const rightScore = gameState.score.right.toString();

    ctx.textAlign = 'right';
    ctx.fillText(leftScore, board.CANVAS_WIDTH / 2 - 60, 30);
    ctx.textAlign = 'left';
    ctx.fillText(rightScore, board.CANVAS_WIDTH / 2 + 60, 30);

    // Player Names (Smaller, less distracting)
    ctx.font = '900 28px monospace';
    ctx.fillText(gameState.current.leftPlayer.alias.toUpperCase(), 20, 20);
    ctx.textAlign = 'right';
    ctx.fillText(gameState.current.rightPlayer.alias.toUpperCase(), board.CANVAS_WIDTH - 20, 20);
}

export function drawText(canvas: HTMLCanvasElement, lines: string[]) {
	const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = '900 28px monospace';
    ctx.textAlign = 'center';

    lines.forEach((line, i) => {
        const textWidth = ctx.measureText(line.toUpperCase()).width;
        // High contrast block
        ctx.fillStyle = COLORS.ACCENT;
        ctx.fillRect(board.CANVAS_WIDTH / 2 - (textWidth/2) - 15, board.CANVAS_HEIGHT / 2 - 50 + (i * 50), textWidth + 30, 45);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(line.toUpperCase(), board.CANVAS_WIDTH / 2, board.CANVAS_HEIGHT / 2 - 15 + i * 50);
    });
}
