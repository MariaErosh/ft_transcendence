import { getAccessToken, refreshAccessToken } from "../auth.js";
import { renderGameBoard } from "../game_front/gameMenu.js";
import { board, gameState } from "../game_front/gameSpecs.js"
import { applyGameBootstrap, setGameBootstrapped } from "../game_front/runtimeImports.js"
import { getWSBaseURL } from "./lobbySocket.js"

export let gameSocket: WebSocket | null = null;
let reconnecting = false;
let manualClose = false;

export async function connectGameWS(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (gameSocket && gameSocket.readyState === WebSocket.OPEN) {
      console.log("Game socket already connected");
      return resolve();
    }

    // Get token from memory
    let token = getAccessToken();

    // Try refreshing if token is missing
    if (!token) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        return reject(new Error("No access token available"));
      }
      token = getAccessToken();
    }

    gameSocket = new WebSocket(`${getWSBaseURL()}/api/game/ws?token=${token}`);
  
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
      if (msg.type === "new_game") {
        console.log("new game info received in game frontend:", msg);
        Object.assign(board, msg.data.board);
        Object.assign(gameState, msg.data.gameState);
	setGameBootstrapped(false);
      }
      if (msg.type === "ready") {
        console.log("ready message received in game frontend");
	//if (gameBootstrapped) return;
	applyGameBootstrap(msg.data);
	console.log(board.CANVAS_WIDTH, board.CANVAS_HEIGHT);
        renderGameBoard();
        return;
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
