import { renderUserMenu } from "./ui.js";
import { renderCreateTournamentForm } from "./match_service/start_page.js";
import { renderLogin, renderRegister } from "./forms.js"
import { renderNewRemoteTournament,  } from "./match_service/render_remote.js";
import { renderNewConsoleTournament } from "./match_service/render_console.js";
import { renderGameBoard } from "./game_front/gameMenu.js";
import { setStop } from "./game_front/gamePlay.js"
import { renderArena } from "./arena.js";
import { renderChat } from "./chat_service/chat.js";
import { initializeProfileUI } from "./profile_front/profile.js";
import { renderFooterLinks } from "./policies/render_footer_links.js";

const app = document.getElementById("app")!;

app.innerHTML = `
	<div id="menu" class="fixed top-4 right-4 z-50"></div>
	<div id="main" class="w-full h-full flex items-center justify-center"></div>
	<div id="chat"></div>
	<div id="profile-window" class="hidden"></div>`;

renderFooterLinks();
renderUserMenu();
renderCreateTournamentForm();
renderChat();
initializeProfileUI();

window.addEventListener("DOMContentLoaded", () => {
	// if user refreshed on a sub-page (like /game), redirect to "/"
	if (location.pathname !== "/") {
		history.replaceState({ view: "main" }, "", "/");
		renderFooterLinks();
		renderUserMenu();
		renderCreateTournamentForm();
		renderChat();
		initializeProfileUI();
	}
});


window.addEventListener("popstate", (event) => {
	const state = event.state;
	if (!state || !state.view) {
		history.replaceState({ view: "main" }, "", "/"); // make URL home
		setStop();
		renderUserMenu();
		renderFooterLinks();
		renderCreateTournamentForm();
		renderChat();
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
			renderFooterLinks();
			renderCreateTournamentForm();
			renderChat();
			break;
		default:
			setStop();
			renderUserMenu();
			renderFooterLinks();
			renderCreateTournamentForm();
			renderChat();
	}
});
