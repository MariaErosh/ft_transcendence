import { renderUserMenu } from "./ui.js";
import { renderCreateTournamentForm } from "./match_service/start_page.js";

const app = document.getElementById("app")!;

app.innerHTML = `
	<div id="menu" class="fixed top-4 right-4 z-50"></div>
	<div id="main" class="w-full h-full flex items-center justify-center"></div>`;

renderUserMenu();
renderCreateTournamentForm();
