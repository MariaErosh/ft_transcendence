import { renderUserMenu } from "./ui.js";
import { renderCreateTournamentForm } from "./match_service/start_page.js";
import { renderLogin, renderRegister } from "./forms.js"
import { renderNewRemoteTournament,  } from "./match_service/render_remote.js";
import { renderNewConsoleTournament } from "./match_service/render_console.js";
import { renderGameBoard } from "./game_front/gameMenu.js";
import { setStop } from "./game_front/gamePlay.js"

const app = document.getElementById("app")!;

app.innerHTML = `
	<div id="menu" class="fixed top-4 right-4 z-50"></div>
	<div id="main" class="w-full h-full flex items-center justify-center"></div>`;

renderUserMenu();
renderCreateTournamentForm();


window.addEventListener("popstate", (event) => {
	setStop();
	const state = event.state;
	if (!state || !state.view) {
		renderCreateTournamentForm();
		return;
	}

	switch(state.view) {
		case "login":
			renderLogin();
			break;
		case "signup":
			renderRegister();
			break;
		case "remote":
			renderNewRemoteTournament();
			break;
		case "console":
			renderNewConsoleTournament();
			break;
		case "game":
			renderGameBoard();
			break;
		case "main":
			renderUserMenu();
			renderCreateTournamentForm();
			break;
		default: 
			renderUserMenu();
			renderCreateTournamentForm();
	}
});
