export function renderGameBoard(container: HTMLElement) {
	// create wrapper for canvas + menu overlay
	const wrapper = document.createElement('div');
	wrapper.className = 'relative w-[800px] h-[600px]';
	
	//creating canvas
	const canvas = document.createElement('canvas');
	canvas.id = 'game-board';
	canvas.width = 800;
	canvas.height = 600;
	canvas.className = 'border-4 border-gray-800 rounded';
	wrapper.appendChild(canvas);

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		console.log("ctx failed to load");
		return;
	}
	else {
		console.log("ctx loaded");
		ctx.fillStyle = '#000000';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	// menu overlay
	const playMenu = document.createElement('div');
	playMenu.id = 'play-menu';
	playMenu.className = 'absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center rounded';

	// create initial menu
	showPlayMenu(playMenu, canvas);

	wrapper.appendChild(playMenu);
	container.appendChild(wrapper);

}

function showPlayMenu(overlay: HTMLElement, canvas: HTMLCanvasElement) {
	overlay.innerHTML = '';

	const menu = document.createElement('div');
	menu.className = 'flex flex-col gap-4 items-center';

	const playBtn = document.createElement('button');
	playBtn.textContent = 'PLAY PONG';
	playBtn.className = 'bg-red-500 text-white text-3xl font-bold px-12 py-4 rounded hover:bg-red-600 transition';
	playBtn.onclick = () => {
		showGameMenu(overlay, canvas);
	};
	menu.appendChild(playBtn);

	overlay.appendChild(menu);
	}

	function showGameMenu(overlay: HTMLElement, canvas: HTMLCanvasElement) {
		overlay.innerHTML = '';

		const menu = document.createElement('div');
		menu.className = 'flex flex-col gap-4 items-center';
		
		const title = document.createElement('h2');
		title.textContent = 'SELECT MODE';
		title.className = 'text-white text-4xl font-bold mb-6';
		menu.appendChild(title);

		    // Select Options Button
		const selectOptionsBtn = document.createElement('button');
		selectOptionsBtn.textContent = 'SELECT OPTIONS';
		selectOptionsBtn.className = 'bg-blue-500 text-white text-2xl font-bold px-10 py-3 rounded hover:bg-blue-600 transition w-64';
		selectOptionsBtn.onclick = () => {
			// Enable start button
			startGameBtn.disabled = false;
			startGameBtn.className = 'bg-green-500 text-white text-2xl font-bold px-10 py-3 rounded hover:bg-green-600 transition w-64 cursor-pointer';
			startGameBtn.onclick = () => {
			//startGame(overlay, canvas, 'default');
			};
		};
		menu.appendChild(selectOptionsBtn);

		// Start Game Button (initially disabled)
		const startGameBtn = document.createElement('button');
		startGameBtn.textContent = 'START GAME';
		startGameBtn.className = 'bg-gray-400 text-gray-600 text-2xl font-bold px-10 py-3 rounded w-64 cursor-not-allowed';
		startGameBtn.disabled = true;
		menu.appendChild(startGameBtn);

		overlay.appendChild(menu);
	}

