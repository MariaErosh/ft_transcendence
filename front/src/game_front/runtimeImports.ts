import { board, gameState } from "./gameSpecs.js";

export let gameBootstrapped = false;

export function setGameBootstrapped(value: boolean) {
    gameBootstrapped = value;
}

export function applyGameBootstrap(data: any) {
	Object.assign(board, data.board);
	Object.assign(gameState, data.gameState);
	gameBootstrapped = true;
}
