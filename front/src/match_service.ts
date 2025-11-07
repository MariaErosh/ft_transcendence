import { createConsoleMatch, sendGameToGameEngine } from "./api.js";
import { renderGameBoard } from "./game_front/gameMenu.js";

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

			const remoteButton = document.createElement("button");
			remoteButton.textContent = "REMOTE";
			remoteButton.className = `
			bg-white text-black font-sans font-semibold
			flex items-center justify-center m-4
			w-1/2 h-1/4
			text-4xl
			hover:bg-gray-200 transition`;

			const consoleButton = document.createElement("button");
			consoleButton.textContent = "CONSOLE";
			consoleButton.className = `
			bg-white text-black font-sans font-semibold
			flex items-center justify-center m-4
			w-1/2 h-1/4
			text-4xl
			hover:bg-gray-200 transition`;
			consoleButton.addEventListener("click", () => {
				renderNewConsoleTournament(container, box);
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



export function renderNewConsoleTournament(container: HTMLElement, box: HTMLElement) {
	box.innerHTML = "";

	const title = document.createElement('div');
	title.textContent = "Enter at least two players for the tournament";
	title.className = "text-white text-4xl font-sans font-semibold mb-8";
	box.appendChild(title);

	const playersBox = document.createElement('div');
	playersBox.className = `
		bg-white text-black font-sans
		w-3/5 h-1/3 overflow-y-auto
		p-4 mb-8
		flex flex-col gap-2
	`;
	box.appendChild(playersBox);

	const inputRow = document.createElement('div');
	inputRow.className = "flex items-center gap-4 mb-8";
	const input = document.createElement("input");
	input.placeholder = "Enter player's alias";
	input.className = `
		w-2/3 p-3  text-black
		border border-gray-400 focus:outline-none
	`;
	inputRow.appendChild(input);

	const addButton = document.createElement("button");
	addButton.textContent = "+";
	addButton.className = `
		bg-white text-black font-sans text-4xl
		w-16 h-16
		flex items-center justify-center
		hover:bg-gray-200 transition
	`;
	inputRow.appendChild(addButton);

	box.appendChild(inputRow);
	const startButton = document.createElement("button");
	startButton.textContent = "START TOURNAMENT";
	startButton.disabled = true;
	startButton.className = `
		bg-gray-500 text-black font-sans font-semibold
		w-2/5 h-1/5 text-3xl
		transition
	`;
	box.appendChild(startButton);

	//--LOGIC--
	const players: string[] = [];
	startButton.addEventListener('click', async () => {
		try {
        const newGame = await createConsoleMatch(players);
		await sendGameToGameEngine(newGame);
        box.innerHTML = "";
		const parent = box.parentElement;
		if (!parent) throw new Error("Black box has no parent");
		renderGameBoard(container);

    } catch (error) {
        console.error("Failed to create match:", error);
        box.innerHTML = "";
        const errorWindow = document.createElement("div");
        errorWindow.className = "text-red-500 text-2xl p-4";
        errorWindow.textContent = `Error: ${error instanceof Error ? error.message : 'Failed to create match'}`;
        box.appendChild(errorWindow);
    }
	});
	function refreshPlayersList() {
		playersBox.innerHTML = '';
		for (const p of players) {
			const row = document.createElement('div');
			row.className = 'text-2xl';
			row.textContent = p;
			playersBox.appendChild(row);
		}

		if (players.length > 1) {
			startButton.disabled = false;
			startButton.classList.remove('bg-gray-500');
			startButton.classList.add("bg-white", "hover:bg-gray-200");

		}
		else {
			startButton.disabled = true;
			startButton.classList.add('bg-gray-500');
			startButton.classList.remove("bg-white", "hover:bg-gray-200");
		}
	}

	addButton.addEventListener('click', () => {
		const name = input.value.trim();
		if (name.length === 0) return;

		const nameExists = players.some((p => p.toLowerCase() === name.toLowerCase()));
		if (nameExists) {
			input.value = '';
			input.placeholder = 'this player is already added';
			setTimeout(() => input.placeholder = "Enter player's alias", 1200);
			return;
		}
		players.push(name);
		refreshPlayersList();
		input.value = "";
	})
}
