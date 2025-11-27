import { draw, drawText } from "./game_front/draw.js"
import { gameSocket } from "./match_service/gameSocket.js";


export function renderArena() {
	const main = document.getElementById("main") as HTMLElement;
	main.innerHTML = "";
}
