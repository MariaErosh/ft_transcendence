import { renderUserMenu } from "./ui.js";
import { renderCreateTournamentForm } from "./match_service/start_page.js";

import { renderGameBoard } from "./game_front/gameMenu.js";

const app = document.getElementById("app");

if (app) {
	console.log("Rendering user menu");
	renderUserMenu(app);
	renderCreateTournamentForm(app);
}
