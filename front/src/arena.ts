import { gameSocket } from "./match_service/gameSocket.js";
import { draw, drawText } from "./game_front/draw.js";


export function renderArena() {
	const main = document.getElementById("main") as HTMLElement;
	main.innerHTML = "";

	let wrapper = document.createElement('div');
	wrapper.id = 'arena-wrapper';
	wrapper.className = `fixed inset-0 flex items-center justify-center`;
	main.appendChild(wrapper);
	
	let arenaBoard = document.createElement("div");
	arenaBoard.id = "arena-board";
	arenaBoard.className = `
		bg-blue w-2/3 h-2/3
		flex flex-col items-center justify-center z-40
	`;
	wrapper.appendChild(arenaBoard);

}
