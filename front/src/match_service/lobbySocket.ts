import { refreshAccessToken } from "../api.js";

export let lobbySocket: WebSocket | null = null;
let reconnecting = false;
let manualClose = false;

export function getWSBaseURL(): string {
	const protocol = window.location.protocol === "https:" ? "wss": "ws";
	return `${protocol}://${window.location.host}`;
}

export async function connectWS(): Promise<void> {
	return new Promise(async (resolve, reject) => {
		if (lobbySocket && lobbySocket.readyState === WebSocket.OPEN) {
			console.log("Socket already connected, skipping new connection");
			resolve(); 
			return;
		}
		let token = localStorage.getItem("accessToken");

		if (!token && !(await refreshAccessToken())) return reject(new Error("No token available!"));

		token = localStorage.getItem("accessToken");
		lobbySocket = new WebSocket(`${getWSBaseURL()}/api/ws?token=${token}`);

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
				if (await refreshAccessToken()) 
          reconnectWS();
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
