import { renderMainMenu } from "./ui.js";
import { renderGameBoard } from "./game/gameMain.js";

const app = document.getElementById("app");
const game = document.getElementById("game");

if (app) {
	console.log("Rendering main menu");
	renderMainMenu(app);
}

if (game) {
	console.log("Rendering game area");
	renderGameBoard(game);
}
