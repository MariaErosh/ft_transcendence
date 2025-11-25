import { socket } from "./match_service/gameSocket.js";


export function renderArena() {
	const gameBoard = document.getElementById('game-board-wrapper') as HTMLElement;
	if (gameBoard) {
		gameBoard.remove();
	}
}
