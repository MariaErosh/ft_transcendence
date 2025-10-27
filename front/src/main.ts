import { renderMainMenu } from "./ui.js";
// import { renderGameBoard } from "./game_purefront/gameMenu.js";
import { renderGameBoard } from "./game_PARTfront/gameMenu.js";

const app = document.getElementById("app");
// const game = document.getElementById("game");

if (app) {
	console.log("Rendering main menu");
	renderMainMenu(app);
	console.log("Rendering game area");
	renderGameBoard(app);
}

// if (game) {
// 	console.log("Rendering game area");
// 	renderGameBoard(game);
// }
