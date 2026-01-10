import { createConsoleMatch, login, register, sendGameToGameEngine, userLoggedIn } from "../api.js";
import { renderArena } from "../arena.js";
import { renderBlackBox, renderMatchMenu } from "../elements.js";
import { renderGameBoard } from "../game_front/gameMenu.js";
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
	const email = `${username}@temp.local`;
	const password = "pw_" + random + Math.random().toString(36).slice(2, 6);
	return { username, email, password };
}

async function createTempUser(){
	const {username, email, password} = generateRandomCredentials();
	try {
		const data = await register(username, email, password, false);
		localStorage.setItem("userid", data.id);
		localStorage.setItem("username", username);
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
	let blackBox = document.getElementById("black-box");
	if (!blackBox) {
		blackBox = renderBlackBox();
		let wrapper = document.getElementById("match-menu") as HTMLElement | null;
		if (!wrapper) {
			wrapper = renderMatchMenu();
		}
		wrapper!.appendChild(blackBox);
	} else {
		blackBox.innerHTML = "";
	}
	blackBox.innerHTML = "";
	blackBox.className = "bg-gray-200 w-2/3 h-2/3 border-8 border-black shadow-[16px_16px_0_0_#000000] flex flex-col items-center justify-center z-40 font-mono p-8";

	const headerGroup = document.createElement('div');
    headerGroup.className = "w-3/5 mb-6 flex flex-col items-start";

    const title = document.createElement('div');
    title.textContent = ">> TOURNAMENT SETUP";
    title.className = "text-black text-5xl font-black tracking-tighter mb-2";

    const subTitle = document.createElement('div');
    subTitle.textContent = "REGISTER AT LEAST TWO OPERATORS";
    subTitle.className = "text-purple-700 text-sm font-bold tracking-widest uppercase";

    headerGroup.appendChild(title);
    headerGroup.appendChild(subTitle);
    blackBox.appendChild(headerGroup);

	const playersBox = document.createElement('div');
	playersBox.className = `
        bg-white text-black font-mono
        w-3/5 h-1/3 overflow-y-auto
        p-4 mb-8
        border-4 border-black
        shadow-[8px_8px_0_0_#000000]
        flex flex-col gap-2
    `;
	blackBox.appendChild(playersBox);

	const inputRow = document.createElement('div');
	inputRow.className = "flex items-center gap-4 mb-8 w-3/5";
	const input = document.createElement("input");
	input.placeholder = "ENTER ALIAS...";
	input.className = `
        flex-1 p-4 text-black font-mono
        border-4 border-black
        focus:outline-none focus:bg-purple-100
        placeholder-gray-400
    `;
	inputRow.appendChild(input);

	const addButton = document.createElement("button");
	addButton.textContent = "+";
	addButton.className = `
        bg-purple-600 text-white font-mono text-4xl
        w-16 h-16 border-4 border-black
        shadow-[4px_4px_0_0_#000000]
        hover:bg-purple-500 active:shadow-none active:translate-x-[2px] active:translate-y-[2px]
        transition-all flex items-center justify-center
    `;
	inputRow.appendChild(addButton);

	blackBox.appendChild(inputRow);
	const startButton = document.createElement("button");
	startButton.textContent = "START TOURNAMENT";
	startButton.disabled = true;
	startButton.className = `
        bg-gray-400 text-gray-700 font-black
        w-2/5 h-16 text-2xl border-4 border-black
        cursor-not-allowed opacity-50
        transition-all
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
						gameId: msg.gameId,
						matchName: msg.matchName
					}))
					renderArena({ type: "start", matchName: "Console" });
					//await renderGameBoard();
				}
				if (msg.type == "end_match"){
					console.log(`End of the tournament ${msg.matchName}, winner: ${msg.winner}`);
					renderArena({ type: "end", matchName: "Console", winner: msg.winner });
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
            row.className = 'text-xl font-bold border-b-2 border-black/10 py-1 flex justify-between items-center';
            row.innerHTML = `
                <span class="text-black">> ${p.toUpperCase()}</span>
                <span class="bg-black text-green-400 px-2 py-0.5 text-xs">READY</span>
            `;
            playersBox.appendChild(row);
		}

		if (players.length > 1) {
			startButton.disabled = false;
            startButton.className = `
                bg-pink-500 text-black font-mono font-black
                w-2/5 h-16 text-2xl border-4 border-black
                shadow-[6px_6px_0_0_#000000]
                hover:bg-pink-400 active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
                transition-all cursor-pointer
            `;
		}
		else {
			startButton.disabled = true;
			startButton.className = `
                bg-gray-400 text-gray-700 font-mono font-black
                w-2/5 h-16 text-2xl border-4 border-black
                cursor-not-allowed opacity-50
            `;
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
