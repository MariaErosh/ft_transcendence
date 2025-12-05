import { refreshAccessToken } from "../api.js";
import { session } from "../ui.js"

export let gameSocket: WebSocket | null = null;
let reconnecting = false;
let manualClose = false;

export async function connectGameWS(): Promise <void> {
  if (gameSocket && gameSocket.readyState === WebSocket.OPEN)
    return;
  if (gameSocket && gameSocket.readyState === WebSocket.CONNECTING) {
    console.log("Socket is connecting, waiting...");
    return new Promise((resolve) => {
      const checkOpen = () => {
        if (gameSocket!.readyState === WebSocket.OPEN) {
          resolve();
        } else {
          setTimeout(checkOpen, 100);
        }
      };
      checkOpen();
    });
  }

  return new Promise (async (resolve, reject)=>{
    let token =  session.accessToken ;// localStorage.getItem("accessToken")

    if (!token && !(await refreshAccessToken())) return reject;
  
    token = session.accessToken ;//  localStorage.getItem("accessToken")
    gameSocket = new WebSocket(`ws://localhost:3000/game/ws?token=${token}`);
  
    gameSocket.onopen = () => {
      console.log("gameWs connected");
      reconnecting = false;
      resolve()
    };
  
    gameSocket.addEventListener("message", async (ev) => {
      const msg = JSON.parse(ev.data);
    
      if (msg.type === "ERROR" && msg.reason === "jwt_expired") {
        if (await refreshAccessToken()) reconnectGameWs();
      }
    });
  
    gameSocket.onclose = () => {
      console.warn("gameWs closed");
  
      if (manualClose) {
        manualClose = false;
        return;
      }
    };
  })
  
}

export function disconnectGameWS() {
  if (!gameSocket) return;
  manualClose = true;
  gameSocket.close();
}

async function reconnectGameWs() {
  if (gameSocket) {
    manualClose = true;
    gameSocket.close();
  }
  await connectGameWS();
}
