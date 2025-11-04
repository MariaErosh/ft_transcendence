import { renderUserMenu } from "./ui.js";
import { renderCreateTournamentForm } from "./match_service.js";

// import { renderGameBoard } from "./game_purefront/gameMenu.js";
import { renderGameBoard } from "./game_PARTfront/gameMenu.js";

const app = document.getElementById("app");
// const game = document.getElementById("game");

if (app) {
	console.log("Rendering user menu");
	renderUserMenu(app);
	// console.log("Rendering game area");
	// renderGameBoard(app);
	renderCreateTournamentForm(app);
}
