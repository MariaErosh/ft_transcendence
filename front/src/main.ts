import { renderUserMenu } from "./ui.js";
import { renderChooseMode, renderStartView } from "./match_service/start_page.js";
import { renderLogin, renderRegister } from "./forms.js"
import { renderNewRemoteTournament,  } from "./match_service/render_remote.js";
import { renderNewConsoleTournament } from "./match_service/render_console.js";
import { renderGameBoard } from "./game_front/gameMenu.js";
import { setStop } from "./game_front/gamePlay.js"
import { renderArena } from "./arena.js";
import { renderFooterLinks, renderPrivacyPolicy, renderTermsOfService } from "./policies/render_footer_links.js";

const app = document.getElementById("app")!;

app.innerHTML = `
	<div id="menu" class="fixed top-4 right-4 z-50"></div>
	<div id="main" class="w-full h-full flex items-center justify-center"></div>`;

renderFooterLinks();
renderUserMenu();
renderStartView();

window.addEventListener("DOMContentLoaded", () => {
	// if user refreshed on a sub-page (like /game), redirect to "/"
	if (location.pathname !== "/") {
		history.replaceState({ view: "main" }, "", "/");
		renderFooterLinks();
		renderUserMenu();
		renderStartView();
	}
});


window.addEventListener("popstate", (event) => {
	const state = event.state;
	if (!state || !state.view) {
		history.replaceState({ view: "main" }, "", "/"); // make URL home
		setStop();
		renderUserMenu();
		renderFooterLinks();
		renderStartView();
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
		case "privacy":
			renderPrivacyPolicy();
			break;
		case "terms":
			renderTermsOfService();
			break;
		case "mode":
			renderChooseMode();
			break;
		case "main":
			setStop();
			renderUserMenu();
			renderFooterLinks();
			renderStartView();
			break;
		default: 
			//history.replaceState({ view: "main" }, "", "/"); // fallback URL to home
			setStop();
			renderUserMenu();
			renderFooterLinks();
			renderStartView();
	}
});
