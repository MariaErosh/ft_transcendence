import { refreshAccessToken } from "../api.js";

export let socket: WebSocket | null = null;
let reconnecting = false;
let manualClose = false;

export async function connectGameWS(gameId: number, side: string): Promise <void> {
  return new Promise (async (resolve, reject)=>{
    let token = localStorage.getItem("accessToken");

    if (!token && !(await refreshAccessToken())) return reject;
  
    token = localStorage.getItem("accessToken");
    socket = new WebSocket(`ws://localhost:3000/game/ws?token=${token}&gameId=${gameId}&side=${side}`);
  
    socket.onopen = () => {
      console.log("gameWs connected");
      reconnecting = false;
      resolve()
    };
  
    socket.addEventListener("message", async (ev) => {
      const msg = JSON.parse(ev.data);
    
      if (msg.type === "ERROR" && msg.reason === "jwt_expired") {
        if (await refreshAccessToken()) reconnectGameWs(gameId, side);
      }
    });
  
    socket.onclose = () => {
      console.warn("gameWs closed");
  
      if (manualClose) {
        manualClose = false;
        return;
      }
    };
  })
  
}

export function disconnectGameWS() {
  if (!socket) return;
  manualClose = true;
  socket.close();
}

async function reconnectGameWs(gameId:number, side:string) {
  if (socket) {
    manualClose = true;
    socket.close();
  }
  await connectGameWS(gameId, side);
}
