	import { gameState, GameState, board } from "./gameSpecs.js";
	import { waitForInput, disconnectEngine} from "./gameMenu.js"
	import { draw, drawNumber, drawText } from "./draw.js";
	import { renderCreateTournamentForm } from "../match_service/start_page.js"
	import { gameSocket } from "../match_service/gameSocket.js";
	import { renderArena } from "../arena.js";


	let frameID: number;
	let gameActive: boolean = false;
	let stopGame: boolean = false;
	const keys: Record<string, boolean> = {};

	export function setStop() {
		stopGame = true;
	}

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
		if (!gameSocket) {
			//console.warn("Socket not initialized yet");
			return;
		}

		if (gameSocket.readyState === WebSocket.OPEN) {
			gameSocket.send(JSON.stringify({ type: "input", data: { code, pressed }}));
		}
	}


	export async function startGame(overlay: HTMLElement, canvas: HTMLCanvasElement) {

		if (!gameSocket || gameSocket.readyState !== WebSocket.OPEN) {
			throw new Error("Game socket not connected");
		}
		gameActive = true;
		//showInstructions(overlay, canvas);
		//overlay.innerHTML = '';
		overlay.style.display = "none";

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		draw(canvas);

		startCountdown(3, canvas, () => {
			gameSocket!.send(JSON.stringify({ type: "please serve" }));
		});

		gameSocket.addEventListener("message", (event) => {
		const message = JSON.parse(event.data);
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
				
				gameActive = false;
				
				if (gameState.current.type == "REMOTE")
					renderArena({ type: "winner", name: gameState.winner.alias });
				else {
					overlay.style = 'flex';
					const winner = ["THE WINNER IS ", gameState.winner.alias];
					drawText(canvas, winner);
					//overlay.innerHTML = '';
				}
			}
		}
	});

		gameSocket.addEventListener("error", (event) => {
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
			toMatchMenu();
			return;
		}
		frameID = requestAnimationFrame(() => loop(overlay, canvas));
	}

function waitForState(): Promise<GameState> {
	return new Promise(resolve => {
		const onMessage = (event: MessageEvent) => {
			const data = JSON.parse(event.data);

			if (data === "set") {
				gameSocket?.removeEventListener("message", onMessage);
				resolve(data.state);
			}
		};
		gameSocket?.addEventListener("message", onMessage);
	});
}

	export function toMatchMenu() {
		//const rootContainer = document.getElementById('app') as HTMLElement;
		for (const key in keys) keys[key] = false;
		cleanup();
		renderCreateTournamentForm();
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
