import { gameSocket } from "./match_service/gameSocket.js";
import { draw, drawText } from "./game_front/draw.js";
import { renderCreateTournamentForm } from "./match_service/start_page.js";
import { renderUserMenu } from "./ui.js";

export 	type ArenaState = 
		| { type: "winner"; name: string }
		| { type: "waiting"; match: string }
		| { type: "end"; matchName: string, winner: string }

export function renderArena(state: ArenaState) {
	const main = document.getElementById("main") as HTMLElement;
	main.innerHTML = "";
	history.pushState({ view:"arena", arenaState: state}, "", "arena");
	
	console.log("rendering arena");
	let arena = document.createElement("div");
	arena.id = "arena";
	arena.className = `
		fixed inset-0
		bg-black/80
		flex flex-col items-center justify-center z-40
	`;
	main.appendChild(arena);

	const board = document.createElement("div");
	board.className = `
		bg-black w-2/3 h-2/3
		flex flex-col items-center justify between
		p-10 rounded-xl
		`;
	arena.appendChild(board);

	let backBtn = document.getElementById("back-button") as HTMLButtonElement | null;
	if (!backBtn) {
		backBtn = document.createElement("button");
		backBtn.id = "back-button";
		backBtn.textContent = "BACK TO MAIN MENU";
		backBtn.className = `
			bg-white text-black font-sans font-semibold
			flex items-center justify-center m-4
			w-1/3 h-12 text-xl
			hover:bg-gray-200 transition
		`;
		board.appendChild(backBtn);

		const contentDiv = document.createElement("div") as HTMLElement;
		contentDiv.className = "flex flex-col items-center gap-4 text-white text-center";
		board.appendChild(contentDiv);
	
		backBtn.addEventListener("click", () => {
			arena.innerHTML = "";
			renderUserMenu();
			renderCreateTournamentForm();
		});

	switch (state.type) {

		case "winner":
			contentDiv.innerHTML = `
			<div class="bg-black/70 text-white text-center p-10 rounded-2xl shadow-xl
						animate-fade-in flex flex-col gap-4 pointer-events-auto">
			<h1 class="text-4xl font-bold">Winner of this game is ${state.name}!</h1>
			<p class="text-2xl">Please wait for the next game or for the tournament results until the other player have finished</p>
			</div>
		`;
		return;

		case "end":
			contentDiv.innerHTML = `
			<div class="bg-black/70 text-white text-center p-10 rounded-2xl shadow-xl
						animate-fade-in flex flex-col gap-4 pointer-events-auto">
			<h1 class="text-4xl font-bold">The tournament is over!</h1>
			<p class="text-2xl">Winner of match ${state.matchName} is ${state.winner}</p>
			</div>
		`;
		return;

		case "waiting":
			contentDiv.innerHTML = `
			<div class="bg-gray-800/70 text-white text-center p-10 rounded-2xl shadow-xl
						animate-fade-in flex flex-col gap-4 pointer-events-auto">
			<h1 class="text-3xl font-semibold">Please Wait</h1>
			<p class="text-xl">The next game of match ${state.match} will start when your opponent is ready</p>
			</div>
		`;
		return;
		}
	}
}
