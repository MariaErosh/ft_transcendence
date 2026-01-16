import { gameSocket } from "./match_service/gameSocket.js";
// import { draw, drawText } from "./game_front/draw.js";
import { renderStartView } from "./match_service/start_page.js";
import { renderUserMenu } from "./ui.js";

let arenaRenderLocked = false;
let pendingArenastate: ArenaState | null = null;

export 	type ArenaState =
		| { type: "winner"; name: string }
		| { type: "waiting"; match: string }
		| { type: "end"; matchName: string, winner: string }
		| { type: "start"; matchName: string }
		| { type: "winner_console"; name: string; }
		| { type: "player left"; loser: string; winner: string; }

export function renderArena(state: ArenaState) {

	// to store the state to be displayed after "player left" has been shown
	if (arenaRenderLocked && state.type != "player left") {
	pendingArenastate = state;
	return;
	}

	const main = document.getElementById("main") as HTMLElement;
	main.innerHTML = "";
	history.pushState({ view:"arena", arenaState: state}, "", "arena");

	//console.log("rendering arena");
	let arena = document.createElement("div");
	arena.id = "arena";
	arena.className = `
		relative min-h-screen w-full
        bg-black/40 backdrop-blur-md
        flex flex-col items-center justify-start py-20 z-40
	`;
	main.appendChild(arena);

	const arenaBoard = document.createElement("div");
	arenaBoard.className = `
		bg-gray-200 w-2/3 min-h-[500px] h-auto
        flex flex-col items-center justify-center
        p-12 border-8 border-black
        shadow-[20px_20px_0_0_#000000]
        font-mono relative my-auto
		`;
	arena.appendChild(arenaBoard);

	const contentDiv = document.createElement("div") as HTMLElement;
	contentDiv.className = "flex flex-col items-center gap-6 text-black text-center w-full";
	arenaBoard.appendChild(contentDiv);

	switch (state.type) {

		case "start":
			contentDiv.innerHTML = `
            <div class="bg-black text-white text-center p-8 border-4 border-white shadow-[6px_6px_0_0_#ffffff]
                        animate-fade-in flex flex-col gap-4 pointer-events-auto">
            <h1 class="text-4xl font-bold"> ${state.matchName} tournament!</h1>
            <p class="text-2xl">Ready to play?</p>

            <button id="ready-btn"
                class="bg-purple-600 text-white px-6 py-3 border-2 border-black font-bold uppercase shadow-[3px_3px_0_0_#000000] hover:bg-purple-500 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all text-xl">
                I'M READY!</button>
            </div>
            `;
            break;
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

		case "player left":
			arenaRenderLocked = true;
			contentDiv.innerHTML = `
                <div class="flex flex-col gap-6">
                    <h1 class="text-6xl font-black uppercase tracking-tighter bg-purple-600 text-white p-4 border-4 border-black shadow-[8px_8px_0_0_#000000]">
                        PLAYER ${state.loser} LEFT THE GAME. </h1>
                    <p class="text-xl font-bold uppercase max-w-md">
                        > VICTORY FOR: ${state.winner}!
                    </p>
                    <div class="animate-pulse text-purple-700 font-black">SYSTEM WAITING...</div>
                </div>
            `;
			setTimeout(() => {
				arenaRenderLocked = false;
				if (pendingArenastate) {
					const next = pendingArenastate;
					pendingArenastate = null;
					renderArena(next);
				}
			}, 3000);
		break;

		case "winner_console":
			contentDiv.innerHTML = `
			<div class="bg-black/70 text-white text-center p-10 rounded-2xl shadow-xl
						animate-fade-in flex flex-col gap-4 pointer-events-auto">
			<h1 class="text-4xl font-bold">Winner of this game is ${state.name}!</h1>
			<p class="text-2xl">Ready for the next game?</p>
			</div>

			<button id="ready-btn"
				class="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-xl transition">
				Yes!</button>
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
                    <p class="text-lg font-bold">TOURNAMENT: ${state.matchName}</p>
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
				arenaBoard.appendChild(backBtn);
				backBtn.addEventListener("click", () => {
					renderUserMenu();
					renderStartView();
				});
			break;

		case "waiting":
			contentDiv.innerHTML = `
                <div class="flex flex-col gap-6 items-center">
                    <div class="text-8xl animate-bounce">⏳</div>
                    <h1 class="text-5xl font-black uppercase tracking-tighter">PLEASE WAIT</h1>
                    <div class="bg-black text-white p-4 font-bold text-lg">
                        TOURNAMENT: ${state.match}
                    </div>
                    <p class="text-xl font-medium italic">
                        "WAITING FOR OPPONENT'S GAME TO END..."
                    </p>
                </div>
            `;
			gameSocket?.send(JSON.stringify({ type: "current match", matchName: state.match }));
		break;
		}

		if (state.type === "start" || state.type === "winner_console") {
			const btn = document.getElementById("ready-btn") as HTMLButtonElement;
			const DISABLED_BTN_CLASS = "bg-gray-400 text-gray-700 font-bold uppercase px-6 py-3 border-2 border-black cursor-not-allowed opacity-70 shadow-none text-xl";
			if (btn) {
				btn.addEventListener("click", async () => {
					gameSocket?.send(JSON.stringify({ type: "PLAYER_READY" }));

					btn.disabled = true;
					btn.innerText = "waiting for opponent to be ready";
					btn.className = DISABLED_BTN_CLASS;
				});
			}
		}
}
