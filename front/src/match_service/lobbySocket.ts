import { refreshAccessToken } from "../api.js";
import { session } from "../ui.js"

export let lobbySocket: WebSocket | null = null;
let reconnecting = false;
let manualClose = false;

export async function connectWS(): Promise<void> {
	return new Promise(async (resolve, reject) => {
		if (lobbySocket && lobbySocket.readyState === WebSocket.OPEN) {
			console.log("Socket already connected, skipping new connection");
			resolve(); // ✅ resolve here so awaiting code continues
			return;
		}
		let token = session.accessToken  // localStorage.getItem("accessToken");

		if (!token && !(await refreshAccessToken())) return reject(new Error("No token available!"));

		token = session.accessToken  // localStorage.getItem("accessToken");
		lobbySocket = new WebSocket(`ws://localhost:3000/ws?token=${token}`);

		lobbySocket.onerror = (err) => {
			console.error("WS connection error:", err);
			reject(new Error("WebSocket failed to connect"));
		};
		
		lobbySocket.onopen = () => {
			console.log("WS connected");
			reconnecting = false;
			resolve();
		};

		lobbySocket.addEventListener("message", async (ev) => {
			const msg = JSON.parse(ev.data);

			if (msg.type === "ERROR" && msg.reason === "jwt_expired") {
				if (await refreshAccessToken()) reconnectWS();
			}
		});

		lobbySocket.onclose = () => {
			console.warn("WS closed");

			if (manualClose) {
				manualClose = false;
				return;
			}

			if (!reconnecting) {
				reconnecting = true;
				setTimeout(connectWS, 1000);
			}
			resolve();
		};
	})

}

export function disconnectWS() {
	if (!lobbySocket) return;
	manualClose = true;
	lobbySocket.close();
}

async function reconnectWS() {
	if (lobbySocket) {
		manualClose = true;
		lobbySocket.close();
	}
	await connectWS();
}
