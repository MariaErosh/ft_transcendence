import { PlayerInput } from "./match_front";
//todo: rewrite via http://gateway:4000"
const BASE_URL = "http://localhost:3000"; 

export async function login(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function verify2FA(userId: number, token: string) {
  const res = await fetch(`${BASE_URL}/auth/2fa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, token }),
  });
  return res.json();
}

export async function register(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function createMatch(players: PlayerInput[]) {
	console.log('Creating tournament with players:', players);
	
	const matchData = {
	  players: players.map(p => ({
	    auth_user_id: p.userId ?? null,
	    alias: p.alias,
	    remote: p.remote
	  }))
	};
  const res = await fetch(`${BASE_URL}/match`, { 
    method: 'POST', 
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(matchData)
  });
	
	return res.json();
}
