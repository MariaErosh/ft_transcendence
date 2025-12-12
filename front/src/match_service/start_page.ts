import { renderNewConsoleTournament } from "./render_console.js";
import { renderNewRemoteTournament } from "./render_remote.js";
import { userLoggedIn } from "../api.js";
import { logout } from "../forms.js";


export function renderCreateTournamentForm() {
	if (localStorage.getItem("temp") === "temp") logout();
	const main = document.getElementById("main")!;
	main.innerHTML = "";
	console.log("Rendering match making menu");
	history.pushState({ view: "main" }, "", "/");

	let wrapper = document.getElementById("match-menu") as HTMLElement | null
	if (!wrapper) {
		wrapper = document.createElement('div');
		wrapper.id = 'match-menu';
		wrapper.className = "fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm";
		main.appendChild(wrapper);
	} else {
		wrapper.innerHTML = "";
	}
	let blackBox = document.getElementById("black-box") as HTMLElement | null;
	if (!blackBox) {
		blackBox = document.createElement("div");
		blackBox.id = "black-box";
		blackBox.className = `
        	bg-gray-200
        	w-2/3 h-2/3
        	border-8 border-black
        	shadow-[16px_16px_0_0_#000000]
        	flex flex-col items-center justify-center
        	z-40 font-mono relative
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
			bg-pink-500 text-black font-black
			border-4 border-black
			shadow-[8px_8px_0_0_#000000]
			flex items-center justify-center
			w-3/5 h-1/3
			text-7xl tracking-tighter
			hover:bg-pink-400 hover:translate-x-[-2px] hover:translate-y-[-2px]
			active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
			transition-all cursor-pointer
		`;
		blackBox.appendChild(playBtn);

		playBtn.addEventListener("click", () => {
			blackBox!.innerHTML = "";

			const header = document.createElement("h2");
			header.textContent = ">> SELECT MODE";
			header.className = "text-4xl font-black mb-8 border-b-4 border-black";
			blackBox.appendChild(header);

			const msg = document.createElement("div");
			msg.className = "text-red-600 font-bold mb-4 uppercase text-sm";
			blackBox.appendChild(msg);

			const remoteButton = document.createElement("button");
			remoteButton.textContent = "REMOTE";
			remoteButton.className = `
				bg-purple-600 text-white font-black
				border-4 border-black m-4
				w-1/2 h-1/5 text-4xl
				shadow-[6px_6px_0_0_#000000]
				hover:bg-purple-500
				active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
				transition-all cursor-pointer
			`;
			remoteButton.addEventListener("click", async () => {
				if (localStorage.getItem("temp") === "temp") {
					msg.textContent = "!! AUTH REQUIRED FOR REMOTE !!";
                	setTimeout(() => logout(), 1000);
                	return;
				}
				if (localStorage.getItem("refreshToken") && await userLoggedIn()) {
					renderNewRemoteTournament();
					history.pushState({ view: "remote" }, "", "remote");
				}
				else msg.textContent = "!! SESSION EXPIRED. LOGIN AGAIN !!"
			});

			const consoleButton = document.createElement("button");
			consoleButton.textContent = "CONSOLE";
			consoleButton.className = `
				bg-pink-500 text-black font-black
				border-4 border-black m-4
				w-1/2 h-1/5 text-4xl
				shadow-[6px_6px_0_0_#000000]
				hover:bg-pink-400
				active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
				transition-all cursor-pointer
			`;
			consoleButton.addEventListener("click", () => {
				renderNewConsoleTournament();
				history.pushState({ view: "console" }, "", "console");
			});

			blackBox.appendChild(remoteButton);
			blackBox.appendChild(consoleButton);
		});
	}
}
