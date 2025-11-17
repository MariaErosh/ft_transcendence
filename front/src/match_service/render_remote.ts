import { createRemoteMatch, getOpenMatches } from "../api.js";
import { ws, connectWS } from "./socket.js";

interface matchPayload {
	id: number;
	name: string;
}
interface PlayerPayload{
	id: number;
	alias: string;
}

export async function renderNewRemoteTournament(container: HTMLElement, box: HTMLElement) {
	await connectWS();
	box.innerHTML = "";

	const title = document.createElement("div");
	title.textContent = "Open Tournaments";
	title.className = "text-white text-4xl font-sans font-semibold mb-8";
	box.appendChild(title);

	// Container for list of open matches
	const listBox = document.createElement("div");
	listBox.className = `
		bg-white text-black font-sans
		w-3/5 h-1/3 overflow-y-auto
		p-4 mb-8 flex flex-col gap-2
	`;
	box.appendChild(listBox);
	const createButton = document.createElement("button");
	createButton.textContent = "+ Create a new match";
	createButton.className = `
		bg-white text-black font-sans font-semibold
		text-2xl w-2/5 h-16 rounded hover:bg-gray-200 transition
	`;
	box.appendChild(createButton);
	async function refreshMatches() {
		listBox.innerHTML = "Loading...";
		try {
			const matches: matchPayload[] = await getOpenMatches(); // [{id, name}, ...]
			listBox.innerHTML = "";

			for (const match of matches) {
				const btn = document.createElement("button");
				btn.textContent = match.name;
				btn.className = `
					bg-gray-100 text-black font-sans text-2xl p-4 rounded
					hover:bg-gray-300 transition
				`;
				btn.addEventListener("click", async () => {
					await joinRoom(match.id, match.name);
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
		box.innerHTML = "";

		const formTitle = document.createElement("div");
		formTitle.textContent = "Enter the name of your new match";
		formTitle.className = "text-white text-3xl font-sans mb-6";
		box.appendChild(formTitle);

		const input = document.createElement("input");
		input.placeholder = "Match name";
		input.className = "p-3 w-2/3 text-black border border-gray-400 rounded mb-4";
		box.appendChild(input);

		const create = document.createElement("button");
		create.textContent = "Create";
		create.className = `
			bg-white text-black font-sans font-semibold
			text-2xl w-1/3 h-16 rounded hover:bg-gray-200 transition
		`;
		box.appendChild(create);
		create.addEventListener("click", async () => {
			const name = input.value.trim();
			if (!name) return;
		
			try {
				// Fetch current matches
				const currentMatches:matchPayload[] = await getOpenMatches();
		
				// Check if the name already exists
				const nameExists = currentMatches.some(
					(m) => m.name.toLowerCase() === name.toLowerCase()
				);
				if (nameExists) {
					alert("A match with this name already exists. Choose a different name.");
					return;
				}
		
				// Create new match
				const newMatch: { id:number, name:string, player: PlayerPayload } = await createRemoteMatch(name);
				console.log("Received a new remote match: ", newMatch);
				await joinRoom(newMatch.id, newMatch.name);
			} catch (err) {
				console.error(err);
				alert("Failed to create match. Try again.");
			}
		});
		
	});


	async function joinRoom(matchId: number, matchName: string) {
		box.innerHTML = "";

		const title = document.createElement("div");
		title.textContent = `Match: ${matchName}`;
		title.className = "text-white text-4xl font-sans font-semibold mb-8";
		box.appendChild(title);

		const playersList = document.createElement("div");
		playersList.className = `
			bg-white text-black font-sans
			w-3/5 h-1/3 overflow-y-auto
			p-4 mb-8 flex flex-col gap-2
		`;
		box.appendChild(playersList);

		//TO CONSIDER: make this button visible only to tournanent owner?
		const startButton = document.createElement("button");
		startButton.textContent = "START";
		startButton.disabled = true;
		startButton.className = `
			bg-gray-500 text-black font-sans font-semibold
			w-1/3 h-16 text-3xl transition
		`;
		box.appendChild(startButton);
		// socket.emit("join_match", { matchId });
		ws?.send(JSON.stringify({
			id: matchId,
			name: matchName,
		}))

		const players: PlayerPayload[] = [];

		ws?.addEventListener("message", (ev)=>{
			const msg = JSON.parse(ev.data);
			if (msg.type === "player_joined" && msg.matchId === matchId && players.indexOf(msg.alias) === -1){
				let payload: PlayerPayload = {alias: msg.alias, id: msg.userId}
				players.push(payload);
				refreshPlayers();
			}
			if (msg.type === "start_game" && msg.matchId === matchId){
				console.log("Ready to start the game: ", msg);
				//TO DO: SEND THE INFORMATION TO THE GAME ENGINE
			}
		})
		function refreshPlayers() {
			playersList.innerHTML = "";
			for (const p of players) {
				const row = document.createElement("div");
				row.textContent = p.alias;
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

		startButton.addEventListener("click", () => {
			// socket.emit("start_match", { matchId });

		});
	}
}