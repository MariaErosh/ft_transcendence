import { createConsoleMatch, login, register, sendGameToGameEngine, userLoggedIn } from "../api.js";
import { renderArena } from "../arena.js";
import { renderGameBoard } from "../game_front/gameMenu.js";
import { logout } from "../ui.js";
import { connectGameWS, disconnectGameWS, gameSocket } from "./gameSocket.js";
import { connectWS, disconnectWS, lobbySocket } from "./lobbySocket.js";

function generateMatchName(){
	const random = Math.random().toString(36).slice(2, 10); // 8 chars
	const matchName = "match_" + random;
	return matchName ;
}

function generateRandomCredentials() {
	const random = Math.random().toString(36).slice(2, 10); // 8 chars
	const username = "temp_" + random;
	const password = "pw_" + random + Math.random().toString(36).slice(2, 6);
	return { username, password };
}

async function createTempUser(){
	const {username, password} = generateRandomCredentials();
	try {
		await register(username, password);
	}
	catch (err){
		console.log("Didn't register temp user: ", err);
	}
	await login(username, password);
	localStorage.setItem("temp", "temp");
}

export async function renderNewConsoleTournament() {
	disconnectWS();
	disconnectGameWS();
	if (!await userLoggedIn())
		await createTempUser();
	await connectWS();
	const matchName = generateMatchName();
	const blackBox = document.getElementById("black-box")!;
	blackBox.innerHTML = "";

	const title = document.createElement('div');
	title.textContent = "Enter at least two players for the tournament";
	title.className = "text-white text-4xl font-sans font-semibold mb-8";
	blackBox.appendChild(title);

	const playersBox = document.createElement('div');
	playersBox.className = `
		bg-white text-black font-sans
		w-3/5 h-1/3 overflow-y-auto
		p-4 mb-8
		flex flex-col gap-2
	`;
	blackBox.appendChild(playersBox);

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

	blackBox.appendChild(inputRow);
	const startButton = document.createElement("button");
	startButton.textContent = "START TOURNAMENT";
	startButton.disabled = true;
	startButton.className = `
		bg-gray-500 text-black font-sans font-semibold
		w-2/5 h-1/5 text-3xl
		transition
	`;
	blackBox.appendChild(startButton);
	await connectGameWS();

	//--LOGIC--
	lobbySocket?.addEventListener("message", async (ev) => {
				const msg = JSON.parse(ev.data);
				console.log ("Message: ", msg);
				if (msg.type === "game_ready"){
					console.log(`Game ready, game id: ${msg.gameId}`)
					gameSocket?.send(JSON.stringify({
						type:"new_game",
						gameId:msg.gameId
					}))
					await renderGameBoard();
				}
				if (msg.type == "end_match"){
					console.log(`End of the tournament ${msg.matchName}, winner: ${msg.winner}`);
					renderArena({ type: "end", matchName: msg.matchName, winner: msg.winner });
				}
			})
	const players: string[] = [];
	startButton.addEventListener('click', async () => {
		try {
			lobbySocket?.send(JSON.stringify({
				type: "join_match",
				match_type:"CONSOLE",
				name: matchName
			}))
			if (!localStorage.getItem("username")) throw new Error ("No username stored");
			await createConsoleMatch(players, matchName, localStorage.getItem("username")!);
			blackBox.innerHTML = "";
		} catch (error) {
			console.error("Failed to create match:", error);
			blackBox.innerHTML = "";
			const errorWindow = document.createElement("div");
			errorWindow.className = "text-red-500 text-2xl p-4";
			errorWindow.textContent = `Error: ${error instanceof Error ? error.message : 'Failed to create match'}`;
			blackBox.appendChild(errorWindow);
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
