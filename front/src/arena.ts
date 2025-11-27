import { socket } from "./match_service/gameSocket.js";
import { draw, drawText } from "./game_front/draw.js"


export function renderArena(winner: string) {
	const main = document.getElementById("main") as HTMLElement;
	main.innerHTML = "";
}
