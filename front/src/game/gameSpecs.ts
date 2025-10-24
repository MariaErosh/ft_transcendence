export const CANVAS_HEIGHT = 700;
export const CANVAS_WIDTH = 1000;

export const PADDLE_WIDTH = 15;
export const PADDLE_HEIGHT = 100;
export const BALL_RADIUS = 9;
export const BALL_SPEED_BASE = 6;
export const MARGIN = 10;

export interface GameState {
	ball: { x: number; y: number };
	leftPaddle: { x: number; y: number };
	rightPaddle: { x: number; y: number };
	speed: { bX: number; bY: number; p: number };
	score: {left: number; right: number };
	servingPlayer: 'left' | 'right';
}

export let gameState: GameState = {
	ball: {
		x: CANVAS_WIDTH / 2,
		y: CANVAS_HEIGHT / 2,
	},
	leftPaddle: {
		x: MARGIN,
		y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2
	},
	rightPaddle: {
		x: CANVAS_WIDTH - PADDLE_WIDTH - MARGIN,
		y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2
	},
	speed : {
		bX: 0,
		bY: 0,
		p: 5
	},
	score: {
		left: 0,
		right: 0
	},
	servingPlayer: whichSide()
};

function whichSide() : 'left' | 'right' {
	return Math.random() < 0.5 ? 'left' : 'right'; //Math.random() returns a float number between 0 and 1
}
// export interface GameConfig {
//   canvasWidth: number;
//   canvasHeight: number;
//   paddleSpeed: number;
// }
