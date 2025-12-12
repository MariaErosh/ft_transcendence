import { lobbySocket, connectWS } from "./lobbySocket.js";
import { getMatchPlayers, getOpenMatches } from "../api.js"
import { connectGameWS, gameSocket } from "./gameSocket.js";
import { renderGameBoard } from "../game_front/gameMenu.js";
import { renderArena } from "../arena.js";


export async function renderNewRemoteTournament() {
	const blackBox = document.getElementById("black-box")!;
	blackBox.innerHTML = "";
	blackBox.className = "bg-gray-200 w-2/3 h-2/3 border-8 border-black shadow-[16px_16px_0_0_#000000] flex flex-col items-center justify-center z-40 font-mono p-8";

	await connectWS();

	const headerGroup = document.createElement('div');
    headerGroup.className = "w-3/5 mb-6 flex flex-col items-start";

    const title = document.createElement("div");
    title.textContent = ">> OPEN TOURNAMENTS";
    title.className = "text-black text-5xl font-black tracking-tighter mb-2";

    const subTitle = document.createElement('div');
    subTitle.textContent = "SELECT AN ACTIVE MATCH OR START YOUR OWN";
    subTitle.className = "text-purple-700 text-sm font-bold tracking-widest uppercase";

    headerGroup.appendChild(title);
    headerGroup.appendChild(subTitle);
    blackBox.appendChild(headerGroup);

	// Container for list of open matches
	const listBox = document.createElement("div");
	listBox.className = `
        bg-white text-black font-mono
        w-3/5 h-1/3 overflow-y-auto
        p-4 mb-8 border-4 border-black
        shadow-[8px_8px_0_0_#000000]
        flex flex-col gap-2
    `;
	blackBox.appendChild(listBox);
	const createButton = document.createElement("button");
	createButton.textContent = "+ NEW MATCH";
    createButton.className = `
        bg-purple-600 text-white font-mono font-black
        text-2xl w-2/5 h-16 border-4 border-black
        shadow-[6px_6px_0_0_#000000]
        hover:bg-purple-500 active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
        transition-all cursor-pointer
    `;
	blackBox.appendChild(createButton);

	async function refreshMatches() {
		listBox.innerHTML = "<div class='text-purple-600 animate-pulse'>SCANNING FOR MATCHES...</div>";
        try {
            const matches: string[] = await getOpenMatches();
            listBox.innerHTML = "";

            for (const match of matches) {
                const btn = document.createElement("button");
                btn.textContent = `> ${match.toUpperCase()}`;
                btn.className = `
                    bg-gray-100 text-black font-bold text-xl p-3 border-2 border-black
                    text-left flex justify-between items-center
                    hover:bg-pink-100 hover:border-pink-500 transition-colors
                `;
                btn.innerHTML = `<span>> ${match.toUpperCase()}</span> <span class="text-xs bg-black text-white px-2 py-1">JOIN</span>`;
                btn.addEventListener("click", () => joinRoom(match));
                listBox.appendChild(btn);
            }
            if (matches.length === 0) listBox.innerHTML = "<div class='text-gray-500 italic uppercase text-sm'>No open matches available.</div>";
        } catch (err) {
            listBox.textContent = "!! ERROR LOADING MATCHES !!";
        }
	}
	refreshMatches();

	// Create new match flow
	createButton.addEventListener("click", () => {
		blackBox.innerHTML = "";

		const formHeader = document.createElement("div");
        formHeader.className = "w-3/5 mb-6";
        formHeader.innerHTML = `
            <div class="text-black text-4xl font-black tracking-tighter uppercase underline decoration-4 underline-offset-8">Create Match</div>
            <div class="text-purple-700 text-sm font-bold mt-4 uppercase">Designate match identifier</div>
        `;
        blackBox.appendChild(formHeader);

		const input = document.createElement("input");
		input.placeholder = "MATCH NAME...";
        input.className = "p-4 w-3/5 text-black font-bold border-4 border-black focus:outline-none focus:bg-purple-100 mb-6 uppercase";
        blackBox.appendChild(input);

		const create = document.createElement("button");
		create.textContent = "INITIALIZE";
        create.className = `
            bg-pink-500 text-black font-black
            text-2xl w-1/3 h-16 border-4 border-black
            shadow-[6px_6px_0_0_#000000]
            hover:bg-pink-400 active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
            transition-all
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
					match_type:"REMOTE",
					name: name,
				}))
				console.log("Received a new remote match: ", name);
				await joinRoom(name);
			} catch (err) {
				console.error(err);
				alert("Failed to create match. Try again.");
			}
		});

	});


async function joinRoom(matchName: string) {

		blackBox.innerHTML = "";

		const headerGroup = document.createElement('div');
        headerGroup.className = "w-3/5 mb-6";
        headerGroup.innerHTML = `
            <div class="text-black text-4xl font-black tracking-tighter uppercase">Match: ${matchName}</div>
            <div class="text-purple-700 text-sm font-bold tracking-widest uppercase">Awaiting participants...</div>
        `;
        blackBox.appendChild(headerGroup);

		const playersList = document.createElement("div");
		playersList.className = `
            bg-white text-black font-mono
            w-3/5 h-1/3 overflow-y-auto
            p-4 mb-8 border-4 border-black
            shadow-[8px_8px_0_0_#000000]
            flex flex-col gap-2
        `;
		blackBox.appendChild(playersList);

		const startButton = document.createElement("button");
		startButton.textContent = "START MATCH";
		startButton.disabled = true;
		startButton.className = `
            bg-gray-400 text-gray-700 font-black
            w-1/3 h-16 text-2xl border-4 border-black
            cursor-not-allowed opacity-50 transition-all
        `;
		blackBox.appendChild(startButton);

		startButton.addEventListener("click", () => {
			console.log("SENDING start_match");
			lobbySocket?.send(JSON.stringify({
				type: "start_match",
				match_type: "REMOTE",
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
		function refreshPlayers() {
			playersList.innerHTML = "";
			for (const p of players) {
				const row = document.createElement("div");
				row.className = "text-xl font-bold border-b-2 border-black/10 py-1 flex justify-between items-center";
                row.innerHTML = `<span>> ${p.toUpperCase()}</span> <span class="bg-black text-green-400 px-2 py-0.5 text-xs">READY</span>`;
                playersList.appendChild(row);
			}

			if (players.length >= 2) {
				startButton.disabled = false;
                startButton.className = "bg-pink-500 text-black font-black w-1/3 h-16 text-2xl border-4 border-black shadow-[6px_6px_0_0_#000000] hover:bg-pink-400 active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all cursor-pointer";
			} else {
				startButton.disabled = true;
                startButton.className = "bg-gray-400 text-gray-700 font-black w-1/3 h-16 text-2xl border-4 border-black cursor-not-allowed opacity-50";
            }
		}

		lobbySocket?.send(JSON.stringify({
			type: "join_match",
			match_type: "REMOTE",
			name: matchName,
		}))
	}
}
