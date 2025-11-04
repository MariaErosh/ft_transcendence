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
  //return res.json();
  const data = await res.json();
  console.log("Register response:", data);
  return data;
}

export interface PlayerPayload {
	auth_user_id: number | null,
	alias: string,
}
interface CreateMatchPayload{
	type: string;
	players: PlayerPayload[];
}

export async function createConsoleMatch(aliases:string[]) {
	const players: PlayerPayload[] = aliases.map(alias => ({
		auth_user_id: null,
		alias
	}));

	const payload: CreateMatchPayload = {
		type: "CONSOLE",
		players
	};

	const res = await fetch(`${BASE_URL}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  //return res.json();
	const data = await res.json();
	console.log("Register response:", data);
	return data;
}

