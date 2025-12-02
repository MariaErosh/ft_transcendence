import { renderUserMenu } from "./ui.js";
import { renderCreateTournamentForm } from "./match_service/start_page.js";
import { renderLogin, renderRegister } from "./forms.js"
import { renderNewRemoteTournament,  } from "./match_service/render_remote.js";
import { renderNewConsoleTournament } from "./match_service/render_console.js";
import { renderGameBoard } from "./game_front/gameMenu.js";
import { setStop } from "./game_front/gamePlay.js"
import { renderChat } from "./chat_service/chat.js";

const app = document.getElementById("app")!;

app.innerHTML = `
	<div id="menu" class="fixed top-4 right-4 z-50"></div>
	<div id="main" class="w-full h-full flex items-center justify-center"></div>
	<div id="chat" class="
	fixed bottom-4 right-4 z-40
	w-16 h-16 sm:w-20 sm:h-20
	bg-pink-500
	rounded-full
	flex items-center justify-center
	text-white text-3xl sm:text-4xl
	font-extrabold
	shadow-[6px_6px_0_0_#000000]
	hover:bg-pink-400
	cursor-pointer
	transition-all duration-150
"> 💬 </div>`;

renderUserMenu();
renderCreateTournamentForm();
renderChat(); // Initialize chat when app loads


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
