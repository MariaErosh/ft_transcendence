import { renderUserMenu } from "./ui.js";
import { renderChooseMode, renderStartView } from "./match_service/start_page.js";
import { renderLogin, renderRegister } from "./forms.js"
import { renderNewRemoteTournament,  } from "./match_service/render_remote.js";
import { renderNewConsoleTournament } from "./match_service/render_console.js";
import { renderGameBoard } from "./game_front/gameMenu.js";
import { setStop } from "./game_front/gamePlay.js"
import { renderArena } from "./arena.js";
import { renderChat } from "./chat_service/chat.js";
import { initializeProfileUI } from "./profile_front/profile.js";
import { renderFooterLinks, renderPrivacyPolicy, renderTermsOfService } from "./policies/render_footer_links.js";


document.documentElement.style.height = "auto";
document.documentElement.style.overflowY = "auto";
document.body.style.height = "auto";
document.body.style.overflowY = "auto";
document.body.className = "m-0 bg-gray-200 min-h-screen";

const app = document.getElementById("app")!;

app.innerHTML = `
    <div id="menu" class="fixed top-4 right-4 z-50"></div>
    <div id="layout" class="w-full min-h-screen flex flex-col overflow-y-auto">
        <div id="main" class="w-full"></div>
        <div id="chat" class="relative"></div>
        <div id="profile-window" class="hidden"></div>
    </div>`;

renderFooterLinks();
renderStartView();
renderUserMenu();
renderChat();
initializeProfileUI();

window.addEventListener("DOMContentLoaded", () => {
	// if user refreshed on a sub-page (like /game), redirect to "/"
	if (location.pathname !== "/") {
		history.replaceState({ view: "main" }, "", "/");
		renderFooterLinks();
		renderUserMenu();
		renderStartView();
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
		renderStartView();
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
			renderChat();
			break;
		default:
			setStop();
			renderUserMenu();
			renderFooterLinks();
			renderStartView();
			renderChat();
	}
});
