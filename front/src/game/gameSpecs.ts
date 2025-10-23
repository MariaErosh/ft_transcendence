export const CANVAS_HEIGHT = 800;
export const CANVAS_WIDTH = 1200;

export const PADDLE_WIDTH = 10;
export const PADDLE_HEIGHT = 100;
export const BALL_RADIUS = 8;
export const PADDLE_SPEED = 6;
export const MARGIN = 10;

export interface GameState {
	ball: { x: number; y: number };
	leftPaddle: { x: number; y: number };
	rightPaddle: { x: number; y: number };
	score: {left: number; right: number };
}

export let gameState: GameState = {
	ball: {
		x: CANVAS_WIDTH / 2 - BALL_RADIUS / 2,
		y: CANVAS_HEIGHT / 2 - BALL_RADIUS / 2,
	},
	leftPaddle: {
		x: MARGIN,
		y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2
	},
	rightPaddle: {
		x: CANVAS_WIDTH - PADDLE_WIDTH - MARGIN,
		y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2
	},
	score: {
		left: 0,
		right: 0
	}
};

// export interface GameConfig {
//   canvasWidth: number;
//   canvasHeight: number;
//   paddleSpeed: number;
// }
