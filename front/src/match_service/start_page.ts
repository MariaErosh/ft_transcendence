// import { setupSocket } from "../game_front/gameMenu.js";
import { renderNewConsoleTournament } from "./render_console.js";
import { renderNewRemoteTournament } from "./render_remote.js";


// setupSocket().catch(err => console.error("Failed to setup socket:", err));

export function renderCreateTournamentForm(container: HTMLElement) {
	console.log("Rendering match making menu");

	let wrapper = document.getElementById("match-menu") as HTMLElement | null;
	if (wrapper) {
		wrapper.remove(); // remove any old one
	}
	wrapper = document.getElementById("match-menu") as HTMLElement | null;
	if (!wrapper) {
		wrapper = document.createElement('div');
		wrapper.id = 'match-menu';
		wrapper.className = `
			fixed inset-0 flex items-center justify-center
		`;

		const blackBox = document.createElement("div");
		blackBox.className = `
			bg-black w-2/3 h-2/3
			flex items-center justify-center
		`;

		const button = document.createElement("button");
		button.textContent = "PLAY PONG";
		button.className = `
			bg-white text-black font-sans font-semibold
			flex items-center justify-center
			w-3/5 h-1/3
			text-7xl
			hover:bg-gray-200 transition
		`;
		button.addEventListener("click", () => {
			const box = button.parentElement;
			if (!box) throw new Error("Parentless Play Pong button");
			box.innerHTML = '';

			const msg = document.createElement("div");
			msg.className = "text-red-500 text-sm";
			blackBox.appendChild(msg);
			const remoteButton = document.createElement("button");
			remoteButton.textContent = "REMOTE";
			remoteButton.className = `
			bg-white text-black font-sans font-semibold
			flex items-center justify-center m-4
			w-1/2 h-1/4
			text-4xl
			hover:bg-gray-200 transition`;
			remoteButton.addEventListener("click", () => {
				if (localStorage.getItem("refreshToken"))
					renderNewRemoteTournament(container, box);
				else
					msg.textContent = "You need to be logged in to play remote";
			})

			const consoleButton = document.createElement("button");
			consoleButton.textContent = "CONSOLE";
			consoleButton.className = `
			bg-white text-black font-sans font-semibold
			flex items-center justify-center m-4
			w-1/2 h-1/4
			text-4xl
			hover:bg-gray-200 transition`;
			consoleButton.addEventListener("click", () => {
				renderNewConsoleTournament(box);
			})

			box.classList.add("flex-col", "gap-6");
			box.appendChild(remoteButton);
			box.appendChild(consoleButton);
		})

		blackBox.appendChild(button);
		wrapper.appendChild(blackBox);
		container.appendChild(wrapper);
	}

}

