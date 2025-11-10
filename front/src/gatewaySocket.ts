import { readyToRender } from "./game_front/gameMenu.js";

export let gatewaySocket: WebSocket;

export function setupGatewaySocket(): Promise<void> {
	return new Promise((resolve, reject) => {
		if (gatewaySocket && gatewaySocket.readyState === WebSocket.OPEN) return resolve();

		gatewaySocket = new WebSocket("ws://localhost:3000/ws");
		gatewaySocket.addEventListener('open', () => {
			console.log("gateway socket is open");
			resolve();
		});

		gatewaySocket.addEventListener('message', (event => {
			const message = JSON.parse(event.data);
			console.log("message received on gateway socket: ", message);
			if (message.type === "start") {
				readyToRender();
			}
		}));
		gatewaySocket.addEventListener("error", (err) => {
			console.error("Socket connection error:", err);
			reject(err);
		});
	});
}
