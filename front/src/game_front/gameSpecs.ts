export interface BoardConstants {
	CANVAS_HEIGHT: number;
	CANVAS_WIDTH: number;
	PADDLE_WIDTH: number;
	PADDLE_HEIGHT: number;
	BALL_RADIUS: number;
	BALL_SPEED_BASE: number;
	MARGIN: number;
}

export let board: BoardConstants = {
	CANVAS_HEIGHT: 0,
	CANVAS_WIDTH: 0,
	PADDLE_WIDTH: 0,
	PADDLE_HEIGHT: 0,
	BALL_RADIUS: 0,
	BALL_SPEED_BASE: 0,
	MARGIN: 0
}

export interface Player { id: number, alias: string }


export interface GameObject {
	leftPlayer: Player;
	rightPlayer: Player;
	gameId: number;
	type: string;
}

export interface GameState {
	ball: { x: number; y: number };
	leftPaddle: { x: number; y: number };
	rightPaddle: { x: number; y: number };
	speed: { bX: number; bY: number; p: number };
	score: {left: number; right: number };
	servingPlayer: 'left' | 'right';
	current: GameObject;
	winner: Player;
}

export let gameState: GameState = {
	ball: { x: 0, y: 0 },
	leftPaddle: { x: 0, y: 0 },
	rightPaddle: { x: 0, y: 0 },
	speed: { bX: 0, bY: 0, p: 6 },
	score: { left: 0, right: 0 },
	servingPlayer: 'left',
	current: {
		leftPlayer: { alias: 'left', id: -1 },
		rightPlayer: { alias: 'right', id: -2 },
		gameId: -1,
		type: 'none'
	},
	winner: { alias: 'none', id: -1 },
}
