import { WebSocket as WS } from "ws";

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
	CANVAS_HEIGHT: 700,
	CANVAS_WIDTH: 1000,

	PADDLE_WIDTH: 15,
	PADDLE_HEIGHT: 100,
	BALL_RADIUS: 10,
	BALL_SPEED_BASE: 6.5,
	MARGIN: 10,
}

export interface Player { alias: string, id: number | null }

export interface PlayerSocket {
	ws: WS;
	token: string;
	id: number;
	alias: string;
}

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
	loser: Player;
}

export function initGameState (): GameState {
	let init: GameState = {} as GameState;
	init.ball = {
		x: board.CANVAS_WIDTH / 2,
		y: board.CANVAS_HEIGHT / 2,
	},
	init.leftPaddle = {
		x: board.MARGIN,
		y: board.CANVAS_HEIGHT / 2 - board.PADDLE_HEIGHT / 2
	},
	init.rightPaddle = {
		x: board.CANVAS_WIDTH - board.PADDLE_WIDTH - board.MARGIN,
		y: board.CANVAS_HEIGHT / 2 - board.PADDLE_HEIGHT / 2
	},
	init.speed = {
		bX: 0,
		bY: 0,
		p: 6
	},
	init.score = {
		left: 0,
		right: 0
	},
	init.servingPlayer = whichSide(),
	init.current = {
		leftPlayer: { alias: 'left', id: -1 },
		rightPlayer: { alias: 'right', id: -2 },
		gameId: -1,
		type: 'none'
	},
	init.winner = { alias: 'none', id: -1 },
	init.loser = { alias: 'none', id: -1 };

	return init;
};

export function whichSide() : 'left' | 'right' {
	return Math.random() < 0.5 ? 'left' : 'right'; //Math.random() returns a float number between 0 and 1
}
