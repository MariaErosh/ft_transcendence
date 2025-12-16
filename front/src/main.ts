import { renderUserMenu } from "./ui.js";
import { renderCreateTournamentForm } from "./match_service/start_page.js";
import { renderLogin, renderRegister } from "./forms.js"
import { renderNewRemoteTournament,  } from "./match_service/render_remote.js";
import { renderNewConsoleTournament } from "./match_service/render_console.js";
import { renderGameBoard } from "./game_front/gameMenu.js";
import { setStop } from "./game_front/gamePlay.js"
import { renderArena } from "./arena.js";
import { renderChat } from "./chat_service/chat.js";

const app = document.getElementById("app")!;

app.innerHTML = `
	<div id="menu" class="fixed top-4 right-4 z-50"></div>
	<div id="main" class="w-full h-full flex items-center justify-center"></div>
	<div id="chat" </div>`;

renderUserMenu();
renderCreateTournamentForm();
renderChat();


window.addEventListener("popstate", (event) => {
	const state = event.state;
	if (!state || !state.view) {
		history.replaceState({ view: "main" }, "", "/"); // make URL home
		setStop();
		renderUserMenu();
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
		case "arena":
			if (state.arenaState) {
				renderArena(state.arenaState);
			} else {
				console.warn("No arena state in history, cannot render");
			}
			break;
		case "main":
			setStop();
			renderUserMenu();
			renderCreateTournamentForm();
			break;
		default:
			setStop();
			renderUserMenu();
			renderCreateTournamentForm();
	}
});
