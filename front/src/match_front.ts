import { startGame } from "./game_PARTfront/gamePlay.js";
import { createMatch } from "./api.js";

interface LoggedInUser {
	id: number;
	username: string;
}

export interface PlayerInput {
	id: string; // unique identifier for the UI
	userId?: number; // if logged in user
	alias: string;
	remote: number;
}

// Mock function - replace with actual API call
async function getLoggedInUsers(): Promise<LoggedInUser[]> {
	// TODO: Replace with actual API call to fetch logged in users
	return [
		{ id: 1, username: "Alice" },
		{ id: 2, username: "Bob" },
		{ id: 3, username: "Charlie" }
	];
}

// Mock function - replace with actual check
function getCurrentUser(): LoggedInUser | null {
	// TODO: Replace with actual current user check (from JWT/session)
	return { id: 1, username: "Alice" };
}


export function showGameMenu(overlay: HTMLElement, canvas: HTMLCanvasElement) {
	overlay.innerHTML = '';

	const menu = document.createElement('div');
	menu.className = 'flex flex-col gap-6 items-center max-w-2xl w-full px-4';

	// Header
	const title = document.createElement('h2');
	title.textContent = 'NEW TOURNAMENT';
	title.className = 'text-white text-4xl font-bold';
	menu.appendChild(title);

	const subtitle = document.createElement('p');
	subtitle.textContent = 'Add at least two players';
	subtitle.className = 'text-gray-300 text-lg mb-2';
	menu.appendChild(subtitle);

	const selectedPlayers: PlayerInput[] = [];
	let guestCounter = 1;

	// Selected players container
	const selectedPlayersContainer = document.createElement('div');
	selectedPlayersContainer.className = 'w-full bg-gray-800 rounded-lg p-4 min-h-[100px] mb-4';

	const selectedPlayersTitle = document.createElement('h3');
	selectedPlayersTitle.textContent = 'Selected Players';
	selectedPlayersTitle.className = 'text-white text-xl font-semibold mb-3';
	selectedPlayersContainer.appendChild(selectedPlayersTitle);

	const selectedPlayersList = document.createElement('div');
	selectedPlayersList.className = 'flex flex-col gap-2';
	selectedPlayersContainer.appendChild(selectedPlayersList);

	menu.appendChild(selectedPlayersContainer);

	// Available players section
	const availablePlayersSection = document.createElement('div');
	availablePlayersSection.className = 'w-full';

	const availablePlayersTitle = document.createElement('h3');
	availablePlayersTitle.textContent = 'Logged In Players';
	availablePlayersTitle.className = 'text-white text-xl font-semibold mb-3';
	availablePlayersSection.appendChild(availablePlayersTitle);

	const availablePlayersList = document.createElement('div');
	availablePlayersList.className = 'flex flex-col gap-2 mb-4';
	availablePlayersSection.appendChild(availablePlayersList);

	menu.appendChild(availablePlayersSection);

	const addGuestBtn = document.createElement('button');
	addGuestBtn.className = 'bg-gray-700 text-white text-lg font-semibold px-6 py-3 rounded-lg hover:bg-gray-600 transition w-full flex items-center justify-center gap-2';
	addGuestBtn.innerHTML = `
		<span class="text-2xl">+</span>
		<span>Add a guest player to play on the same console</span>
	`;
	addGuestBtn.onclick = () => {
		const guestPlayer: PlayerInput = {
			id: `guest-${Date.now()}`,
			alias: `Guest ${guestCounter++}`,
			remote: 0
		};
		addPlayerToSelection(guestPlayer);
	};
	menu.appendChild(addGuestBtn);

	const createTournamentBtn = document.createElement('button');
	createTournamentBtn.textContent = 'CREATE TOURNAMENT';
	createTournamentBtn.className = 'bg-gray-400 text-gray-600 text-2xl font-bold px-10 py-4 rounded-lg w-full cursor-not-allowed mt-4';
	createTournamentBtn.disabled = true;
	menu.appendChild(createTournamentBtn);

	// Update selected players display
	function updateSelectedPlayersDisplay() {
		selectedPlayersList.innerHTML = '';

		if (selectedPlayers.length === 0) {
			const emptyMessage = document.createElement('p');
			emptyMessage.textContent = 'No players selected yet';
			emptyMessage.className = 'text-gray-400 text-center py-4';
			selectedPlayersList.appendChild(emptyMessage);
		} else {
			selectedPlayers.forEach((player) => {
				const playerItem = document.createElement('div');
				playerItem.className = 'bg-gray-700 text-white px-4 py-2 rounded flex justify-between items-center';

				const playerName = document.createElement('span');
				playerName.textContent = player.remote === 0 ? `${player.alias} 🎮` : player.alias;
				playerItem.appendChild(playerName);

				const removeBtn = document.createElement('button');
				removeBtn.textContent = '×';
				removeBtn.className = 'text-red-400 hover:text-red-300 text-2xl font-bold';
				removeBtn.onclick = () => removePlayerFromSelection(player.id);
				playerItem.appendChild(removeBtn);

				selectedPlayersList.appendChild(playerItem);
			});
		}
		// Update create tournament button state
		if (selectedPlayers.length >= 2) {
			createTournamentBtn.disabled = false;
			createTournamentBtn.className = 'bg-green-500 text-white text-2xl font-bold px-10 py-4 rounded-lg w-full cursor-pointer hover:bg-green-600 transition mt-4';
			createTournamentBtn.onclick = () => {
				//Create tornament and start game
				// createMatch(selectedPlayers);
				//TODO: Pass players data to the game here
				startGame(overlay, canvas);
			};
		} else {
			createTournamentBtn.disabled = true;
			createTournamentBtn.className = 'bg-gray-400 text-gray-600 text-2xl font-bold px-10 py-4 rounded-lg w-full cursor-not-allowed mt-4';
			createTournamentBtn.onclick = null;
		}
	}
	// Add player to selection
	function addPlayerToSelection(player: PlayerInput) {
		// Check if already selected
		if (selectedPlayers.find(p => p.id === player.id)) {
			return;
		}
		selectedPlayers.push(player);
		updateSelectedPlayersDisplay();
		updateAvailablePlayersDisplay();
	}

	// Remove player from selection
	function removePlayerFromSelection(playerId: string) {
		const index = selectedPlayers.findIndex(p => p.id === playerId);
		if (index > -1) {
			selectedPlayers.splice(index, 1);
			updateSelectedPlayersDisplay();
			updateAvailablePlayersDisplay();
		}
	}
	// Update available players display
	function updateAvailablePlayersDisplay() {
		availablePlayersList.innerHTML = '';

		getLoggedInUsers().then((users) => {
			users.forEach((user) => {
				const isSelected = selectedPlayers.find(p => p.userId === user.id);

				const userBtn = document.createElement('button');
				userBtn.textContent = user.username;
				userBtn.className = isSelected
					? 'bg-gray-600 text-gray-400 px-4 py-2 rounded cursor-not-allowed'
					: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 transition';
				userBtn.disabled = !!isSelected;

				if (!isSelected) {
					userBtn.onclick = () => {
						const player: PlayerInput = {
							id: `user-${user.id}`,
							userId: user.id,
							alias: user.username,
							remote: 1
						};
						addPlayerToSelection(player);
					};
				}
				availablePlayersList.appendChild(userBtn);
			});
		});
	}

	// Initialize display
	updateSelectedPlayersDisplay();
	updateAvailablePlayersDisplay();

	overlay.appendChild(menu);
}

