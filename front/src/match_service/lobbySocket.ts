import { refreshAccessToken } from "../api.js";

export let ws: WebSocket | null = null;
let reconnecting = false;
let manualClose = false;

export async function connectWS(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let token = localStorage.getItem("accessToken");

    if (!token && !(await refreshAccessToken())) return reject;

    token = localStorage.getItem("accessToken");
    ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);

    ws.onopen = () => {
      console.log("WS connected");
      reconnecting = false;
      resolve();
    };

    ws.addEventListener("message", async (ev) => {
      const msg = JSON.parse(ev.data);

      if (msg.type === "ERROR" && msg.reason === "jwt_expired") {
        if (await refreshAccessToken()) reconnectWS();
      }
    });

    ws.onclose = () => {
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
  if (!ws) return;
  manualClose = true;
  ws.close();
}

async function reconnectWS() {
  if (ws) {
    manualClose = true;
    ws.close();
  }
  await connectWS();
}
