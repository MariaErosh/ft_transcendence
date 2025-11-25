	import { gameState, GameState, board } from "./gameSpecs.js";
	import { waitForInput, disconnectEngine} from "./gameMenu.js"
	import { draw, drawNumber, drawText } from "./draw.js";
	import { renderCreateTournamentForm } from "../match_service/start_page.js"
	import { socket } from "../match_service/gameSocket.js";


	let frameID: number;
	let gameActive: boolean = false;
	let stopGame: boolean = false; 
	const keys: Record<string, boolean> = {};

	function handleKeyDown(e: KeyboardEvent) {
		if (!gameActive) return;
		if (e.code === "ArrowUp" || e.code === "ArrowDown" ||
		e.code === "KeyW" || e.code === "KeyS" || e.code === 'Escape') e.preventDefault();
		if (!keys[e.code]) {
			keys[e.code] = true;
			sendKey(e.code, true); 
		}
		if (keys['Escape'])
			stopGame = true;
	}
	function handleKeyUp(e: KeyboardEvent) {
		if (!gameActive) return;
		if (keys[e.code]) {
		keys[e.code] = false;
		sendKey(e.code, false); }
	}

	function sendKey(code: string, pressed: boolean) {
		if (!socket) {
			//console.warn("Socket not initialized yet");
			return;
		}

		if (socket.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify({ type: "input", data: { code, pressed }}));
		}
	}


	export async function startGame(overlay: HTMLElement, canvas: HTMLCanvasElement) {

		if (!socket || socket.readyState !== WebSocket.OPEN) {
			throw new Error("Game socket not connected");
		}
		gameActive = true;
		//showInstructions(overlay, canvas);
		//overlay.innerHTML = '';
		overlay.style.display = "none";

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		socket.addEventListener("message", (event) => {
		const message = JSON.parse(event.data);

		if (message.type === "set") {
			console.log("received inital game state from server via set message");
			//const getState = await waitForInput<GameState>("set");
			Object.assign(gameState, message.data);
			//overlay.style.display = 'none';
			draw(canvas);

			startCountdown(3, canvas, () => {
				socket!.send(JSON.stringify({ type: "please serve" }));
			});
		}
		
		if (message.type === "go") {
			loop(overlay, canvas);
		}
		if (message.type === "stop")
			stopGame = true;
		if (message.type === "state" || message.type === "win") {
			const getState: GameState = message.data;
			Object.assign(gameState, getState);
			if (message.type === "win") {
				draw(canvas);
				cancelAnimationFrame(frameID);
				overlay.style = 'flex';
				const winner = ["THE WINNER IS ", gameState.winner.alias];
				drawText(canvas, winner);
				gameActive = false;

				overlay.innerHTML = '';
				if (message.next === -1)
				{
					const statBtn = document.createElement('button');
					statBtn.textContent = "THE END - SEE RESULTS";
					statBtn.className = 'bg-white-500 text-black text-2xl font-bold px-10 py-3 hover:bg-grey-600 transition w-64';
					statBtn.style.marginTop = '100px';
					statBtn.onclick = () => {
						overlay.innerHTML = '';
						let lines = [
							"THIS IS A PLACEHOLDER FOR THE DISPLAY",
							"OF THE TOURNAMENT'S RESULTS",
						];
						const menuBtn = document.createElement('button');
						menuBtn.textContent = "BACK TO MENU";
						menuBtn.className = 'bg-white-500 text-black text-2xl font-bold px-10 py-3 hover:bg-grey-600 transition w-64';
						menuBtn.style.marginTop = '200px';
						drawText(canvas, lines);
						menuBtn.onclick = () => {
							toMatchMenu();
						}
						overlay.appendChild(menuBtn);
					}
					overlay.appendChild(statBtn);

				} else { 
				const nextBtn = document.createElement('button');
				nextBtn.textContent = 'READY FOR NEXT GAME';
				nextBtn.className = 'bg-white-500 text-black text-2xl font-bold px-10 py-3 hover:bg-grey-600 transition w-64';
				nextBtn.style.marginTop = '200px';
				nextBtn.onclick = () => {
					//socket.send(JSON.stringify({ type: "ready" }));
					//disconnectEngine()
					startGame(overlay, canvas);
				};
				overlay.appendChild(nextBtn);
			}
				}
		}
		});
			
		// const readyBtn = document.createElement('button');
		// readyBtn.textContent = 'READY';
		// readyBtn.className = 'bg-blue-500 text-white text-2xl font-bold px-10 py-3 rounded hover:bg-blue-600 transition w-64';
		// readyBtn.style.marginTop = '200px';
		// readyBtn.onclick = () => {
		// 	socket.send(JSON.stringify({ type: "ready" }));
		// 	readyBtn.disabled = true;
		// 	readyBtn.textContent = 'WAITING...';
		// 	readyBtn.className = 'bg-gray-200 text-gray-400 text-2xl font-bold px-10 py-3 rounded w-64';
		// };
		// overlay.appendChild(readyBtn);

		// const getState = await waitForInput<GameState>("set");
		// Object.assign(gameState, getState);
		// //overlay.style.display = 'none';
		// draw(canvas);

		// startCountdown(3, canvas, () => {
		// 	socket!.send(JSON.stringify({ type: "please serve" }));
		// });

		socket.addEventListener("error", (event) => {
			console.error("WebSocket encountered an error:", event);
		});
	}	

	function loop(overlay: HTMLElement, canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d');
		if (!ctx) return console.log('ctx failed to load inside loop function');

		draw(canvas);
		if (stopGame) {
			keys['Escape'] = false;
			stopGame = false;
			cancelAnimationFrame(frameID);
			//ctx.clearRect(0, 0, board.CANVAS_WIDTH, board.CANVAS_HEIGHT);
			// const rootContainer = document.getElementById('app') as HTMLElement;
			// cleanup();
			// renderCreateTournamentForm(rootContainer);
			toMatchMenu();
			return;
		}
		frameID = requestAnimationFrame(() => loop(overlay, canvas));
	}

	export function toMatchMenu() {
		const rootContainer = document.getElementById('app') as HTMLElement;
		for (const key in keys) keys[key] = false;
		cleanup();
		renderCreateTournamentForm(rootContainer);
	}

	export function cleanup() {
		gameActive = false;
		stopGame = false;
		window.removeEventListener('keydown', handleKeyDown);
		window.removeEventListener('keyup', handleKeyUp);
		const gameBoard = document.getElementById('game-board-wrapper') as HTMLElement;
		if (gameBoard) gameBoard.remove();
		disconnectEngine();
	}


	function startCountdown(count: number, canvas: HTMLCanvasElement, callback: () => void) {
		const ctx = canvas.getContext('2d');
		if (!ctx) return console.log('ctx failed to load inside startCountdown function');

		requestAnimationFrame(() => {
			draw(canvas);
			drawNumber(ctx, count);
			count--;

			const intervalId = setInterval(() => {
				ctx.clearRect(0, 0, board.CANVAS_WIDTH, board.CANVAS_HEIGHT);
				draw(canvas);			
				drawNumber(ctx, count);

				count--;
				if (count < 0) {
					clearInterval(intervalId);
					callback();
				}
		}, 1000);
		});
	}
