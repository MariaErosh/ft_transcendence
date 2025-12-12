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
		bg-black/40 backdrop-blur-md
		flex flex-col items-center justify-center z-40
	`;
	main.appendChild(arena);

	const board = document.createElement("div");
	board.className = `
		bg-gray-200 w-2/3 h-2/3
        flex flex-col items-center justify-center
        p-12 border-8 border-black
        shadow-[20px_20px_0_0_#000000]
        font-mono relative
		`;
	arena.appendChild(board);

	const contentDiv = document.createElement("div") as HTMLElement;
	contentDiv.className = "flex flex-col items-center gap-6 text-black text-center w-full";
	board.appendChild(contentDiv);


	switch (state.type) {

		case "winner":
			contentDiv.innerHTML = `
                <div class="flex flex-col gap-6">
                    <h1 class="text-6xl font-black uppercase tracking-tighter bg-purple-600 text-white p-4 border-4 border-black shadow-[8px_8px_0_0_#000000]">
                        VICTORY: ${state.name}!
                    </h1>
                    <p class="text-xl font-bold uppercase max-w-md">
                        > STAND BY FOR SUBSEQUENT ROUNDS <br>
                        > SYNCING TOURNAMENT DATA...
                    </p>
                    <div class="animate-pulse text-purple-700 font-black">SYSTEM WAITING...</div>
                </div>
            `;
		break;

		case "end":
			contentDiv.innerHTML = `
                <div class="flex flex-col gap-6">
                    <h1 class="text-5xl font-black uppercase tracking-tighter border-b-8 border-black pb-4">
                        TOURNAMENT COMPLETE
                    </h1>
                    <div class="bg-pink-500 text-black text-3xl font-black p-6 border-4 border-black shadow-[10px_10px_0_0_#000000]">
                        WINNER: ${state.winner}
                    </div>
                    <p class="text-lg font-bold">MATCH IDENTIFIER: ${state.matchName}</p>
                </div>
            `;
				const backBtn = document.createElement("button");
				backBtn.id = "back-button";
				backBtn.textContent = "BACK TO MAIN MENU";
				backBtn.className = `
					mt-10 bg-white text-black font-black
                	px-8 py-4 text-2xl border-4 border-black
                	shadow-[6px_6px_0_0_#000000]
                	hover:bg-gray-100 hover:translate-x-[-2px] hover:translate-y-[-2px]
                	active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                	transition-all cursor-pointer
				`;
				board.appendChild(backBtn);
				backBtn.addEventListener("click", () => {
					arena.innerHTML = "";
					renderUserMenu();
					renderCreateTournamentForm();
				});
			break;

		case "waiting":
			contentDiv.innerHTML = `
                <div class="flex flex-col gap-6 items-center">
                    <div class="text-8xl animate-bounce">⏳</div>
                    <h1 class="text-5xl font-black uppercase tracking-tighter">PLEASE WAIT</h1>
                    <div class="bg-black text-white p-4 font-bold text-lg">
                        MATCH: ${state.match}
                    </div>
                    <p class="text-xl font-medium italic">
                        "OPPONENT IS INITIALIZING HARDWARE..."
                    </p>
                </div>
            `;
		break;
		}
	}
