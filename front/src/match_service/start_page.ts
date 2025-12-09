// import { setupSocket } from "../game_front/gameMenu.js";
import { renderNewConsoleTournament } from "./render_console.js";
import { renderNewRemoteTournament } from "./render_remote.js";
import { lobbySocket, connectWS } from "./lobbySocket.js";
import { userLoggedIn } from "../api.js";
import { session } from "../ui.js";



// setupSocket().catch(err => console.error("Failed to setup socket:", err));

export function renderCreateTournamentForm() {
	const main = document.getElementById("main")!;
	main.innerHTML = "";
	console.log("Rendering match making menu");
	history.pushState({ view:"main"}, "", "/");

	let wrapper = document.getElementById("match-menu") as HTMLElement | null;
	// if (wrapper) {
	// 	wrapper.remove(); // remove any old one
	// }
	// wrapper = document.getElementById("match-menu") as HTMLElement | null;
	if (!wrapper) {
		wrapper = document.createElement('div');
		wrapper.id = 'match-menu';
		wrapper.className = `
			fixed inset-0 flex items-center justify-center
		`;
		main.appendChild(wrapper);
	} else {
		wrapper.innerHTML = "";
	}
	let blackBox = document.getElementById("black-box") as HTMLElement | null;
	if (!blackBox) {
		blackBox = document.createElement("div");
		blackBox.id = "black-box";
		blackBox.className = `
			bg-black w-2/3 h-2/3
			flex flex-col items-center justify-center z-40
		`;
		wrapper.appendChild(blackBox);
	} else {
		blackBox.innerHTML = "";
	}

	let playBtn = document.getElementById("play-button") as HTMLButtonElement | null;
	if (!playBtn) {
		playBtn = document.createElement("button");
		playBtn.id = "play-button";
		playBtn.textContent = "PLAY PONG";
		playBtn.className = `
			bg-white text-black font-sans font-semibold
			flex items-center justify-center
			w-3/5 h-1/3
			text-7xl
			hover:bg-gray-200 transition
		`;
		blackBox.appendChild(playBtn);

		playBtn.addEventListener("click", () => {
			blackBox!.innerHTML = "";
			// const box = button.parentElement;
			// if (!box) throw new Error("Parentless Play Pong button");
			// box.innerHTML = '';
			const msg = document.createElement("div");
			msg.className = "text-red-500 text-sm";
			blackBox!.appendChild(msg);

			const remoteButton = document.createElement("button");
			remoteButton.textContent = "REMOTE";
			remoteButton.className = `
			bg-white text-black font-sans font-semibold
			flex items-center justify-center m-4
			w-1/2 h-1/4
			text-4xl
			hover:bg-gray-200 transition`;
			remoteButton.addEventListener("click", async () => {
				if(session.refreshToken && await userLoggedIn())//localStorage.getItem("refreshToken")
				{
					try {
					await connectWS();
					renderNewRemoteTournament();
					history.pushState({ view:"remote"}, "", "remote");
				} catch (err) {
					msg.textContent = "You need to be logged in to play remote";
				}
			}
			else {
				msg.textContent = "You need to be logged in to play remote";
			}
			});
			blackBox!.appendChild(remoteButton);

			const consoleButton = document.createElement("button");
			consoleButton.textContent = "CONSOLE";
			consoleButton.className = `
			bg-white text-black font-sans font-semibold
			flex items-center justify-center m-4
			w-1/2 h-1/4
			text-4xl
			hover:bg-gray-200 transition`;
			consoleButton.addEventListener("click", () => {
				renderNewConsoleTournament();
				history.pushState({ view:"console"}, "", "console");
			})
			//box.classList.add("flex-col", "gap-6");
			blackBox!.appendChild(consoleButton);
		})
	}
}
