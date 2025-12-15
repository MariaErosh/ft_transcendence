import { lobbySocket, connectWS } from "./lobbySocket.js";
import { getMatchPlayers, getOpenMatches } from "../api.js"
import { connectGameWS, gameSocket } from "./gameSocket.js";
import { renderGameBoard } from "../game_front/gameMenu.js";
import { renderArena } from "../arena.js";

interface matchPayload {
	id: number;
	name: string;
}
interface PlayerPayload {
	id: number;
	alias: string;
}

export async function renderNewRemoteTournament() {
		const blackBox = document.getElementById("black-box")!;
		blackBox.innerHTML = "";

	await connectWS();
	let gameOwner = false;

	const title = document.createElement("div");
	title.textContent = "Open Tournaments";
	title.className = "text-white text-4xl font-sans font-semibold mb-8";
	blackBox.appendChild(title);

	// Container for list of open matches
	const listBox = document.createElement("div");
	listBox.className = `
		bg-white text-black font-sans
		w-3/5 h-1/3 overflow-y-auto
		p-4 mb-8 flex flex-col gap-2
	`;
	blackBox.appendChild(listBox);
	const createButton = document.createElement("button");
	createButton.textContent = "+ Create a new match";
	createButton.className = `
		bg-white text-black font-sans font-semibold
		text-2xl w-2/5 h-16 rounded hover:bg-gray-200 transition
	`;
	blackBox.appendChild(createButton);
	async function refreshMatches() {
		listBox.innerHTML = "Loading...";
		try {
			const matches: string[] = await getOpenMatches(); // REQUEST VIA WEBSOCKET
			listBox.innerHTML = "";

			for (const match of matches) {
				const btn = document.createElement("button");
				btn.textContent = match;
				btn.className = `
					bg-gray-100 text-black font-sans text-2xl p-4 rounded
					hover:bg-gray-300 transition
				`;
				btn.addEventListener("click", async () => {
					await joinRoom(match);
				});
				listBox.appendChild(btn);
			}
			if (matches.length === 0) listBox.textContent = "No open matches available.";
		} catch (err) {
			console.error(err);
			listBox.textContent = "Failed to load matches.";
		}
	}
	refreshMatches();

	// Create new match flow
	createButton.addEventListener("click", () => {
		blackBox.innerHTML = "";

		const formTitle = document.createElement("div");
		formTitle.textContent = "Enter the name of your new match";
		formTitle.className = "text-white text-3xl font-sans mb-6";
		blackBox.appendChild(formTitle);

		const input = document.createElement("input");
		input.placeholder = "Match name";
		input.className = "p-3 w-2/3 text-black border border-gray-400 rounded mb-4";
		blackBox.appendChild(input);

		const create = document.createElement("button");
		create.textContent = "Create";
		create.className = `
			bg-white text-black font-sans font-semibold
			text-2xl w-1/3 h-16 rounded hover:bg-gray-200 transition
		`;
		blackBox.appendChild(create);
		create.addEventListener("click", async () => {
			const name = input.value.trim();
			if (!name) return;

			try {
				// Fetch current matches
				const currentMatches: string[] = await getOpenMatches();

				// Check if the name already exists
				const nameExists = currentMatches.some(
					(m) => m.toLowerCase() === name.toLowerCase()
				);
				if (nameExists) {
					alert("A match with this name already exists. Choose a different name.");
					return;
				}
				lobbySocket?.send(JSON.stringify({
					type: "new_match",
					name: name,
				}))
				console.log("Received a new remote match: ", name);
				gameOwner = true;
				await joinRoom(name);
			} catch (err) {
				console.error(err);
				alert("Failed to create match. Try again.");
			}
		});

	});


async function joinRoom(matchName: string) {

		blackBox.innerHTML = "";

		const title = document.createElement("div");
		title.textContent = `Match: ${matchName}`;
		title.className = "text-white text-4xl font-sans font-semibold mb-8";
		blackBox.appendChild(title);

		const playersList = document.createElement("div");
		playersList.className = `
			bg-white text-black font-sans
			w-3/5 h-1/3 overflow-y-auto
			p-4 mb-8 flex flex-col gap-2
		`;
		blackBox.appendChild(playersList);

		const startButton = document.createElement("button");
		startButton.textContent = "START";
		startButton.disabled = true;
		startButton.className = `
			bg-gray-500 text-black font-sans font-semibold
			w-1/3 h-16 text-3xl transition
		`;
		blackBox.appendChild(startButton);

		startButton.addEventListener("click", () => {
			console.log("SENDING start_match");
			lobbySocket?.send(JSON.stringify({
				type: "start_match",
				name: matchName
			}))
		});

		let players: string[] = await getMatchPlayers(matchName) || [];
		console.log("Players from gateway: ", players);
		refreshPlayers();
		await connectGameWS();

		lobbySocket?.addEventListener("message", async (ev) => {
			const msg = JSON.parse(ev.data);
			console.log ("Message: ", msg);

			if (msg.type === "player_joined" && msg.name === matchName) {
				if (players.indexOf(msg.alias) === -1){
					players.push(msg.alias);
					refreshPlayers();
				}
			}
			if (msg.type === "start_match" && msg.matchName === matchName) {
				renderArena({ type: "waiting", match: matchName });
				console.log("Ready to start the match: ", msg);
			}
			if (msg.type === "game_ready"){
				console.log(`Game ready, game id: ${msg.gameId}, match: ${msg.matchName}, side: ${msg.side}, opponent: ${msg.opponent}`)
				// await connectGameWS();
				gameSocket?.send(JSON.stringify({
					type:"new_game",
					gameId:msg.gameId
				}))
				//await renderGameBoard();
				renderArena({ type: "start", matchName: matchName})
			}
			if (msg.type == "end_match"){
				console.log(`End of the tournament ${msg.matchName}, winner: ${msg.winner}`);
				renderArena({ type: "end", matchName: msg.matchName, winner: msg.winner });
			}
		})
		function refreshPlayers() {
			playersList.innerHTML = "";
			for (const p of players) {
				const row = document.createElement("div");
				row.textContent = p;
				row.className = "text-2xl";
				playersList.appendChild(row);
			}

			if (players.length >= 2) {
				startButton.disabled = false;
				startButton.classList.remove("bg-gray-500");
				startButton.classList.add("bg-white", "hover:bg-gray-200");
			} else {
				startButton.disabled = true;
				startButton.classList.add("bg-gray-500");
				startButton.classList.remove("bg-white", "hover:bg-gray-200");
			}
		}

		lobbySocket?.send(JSON.stringify({
			type: "join_match",
			name: matchName,
		}))
	}
}
