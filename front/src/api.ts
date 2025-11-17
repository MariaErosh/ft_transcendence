//todo: rewrite via http://gateway:4000"
const BASE_URL = "http://localhost:3000";

interface ApiRequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

interface RefreshResponse {
  accessToken?: string;
  refreshToken?: string;
  refreshExpiresAt?: string;
}


export async function authorisedRequest<T=any>(url: string, options: ApiRequestOptions = {}) {
  const accessToken = localStorage.getItem("accessToken");

  options.headers = {
    ...(options.headers || {}),
    "Authorization": `Bearer ${accessToken}`,
  };

  let res = await fetch(`${BASE_URL}${url}`, options);

  if (res.status === 401 && localStorage.getItem("refreshToken")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return authorisedRequest(url, options); // retry request
  }
  const data = await res.json();
  console.log("Result in authorisedRequest:", data);
  return data;
}

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return false;

  const data: RefreshResponse = await res.json();

  if (!data.accessToken) return false;

  localStorage.setItem("accessToken", data.accessToken);
  if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);

  return true;
}

export async function login(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (data.accessToken) {
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("refreshExpiresAt", data.refreshExpiresAt);
  }
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


interface CreateMatchPayload{
	type: string;
	players: Player[];
}

export async function createConsoleMatch(aliases:string[]) {
	const players: Player[] = aliases.map(alias => ({
		id: null,
		alias
	}));

	const payload: CreateMatchPayload = {
		type: "CONSOLE",
		players
	};

	const res = await fetch(`${BASE_URL}/match/console/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
	const data = await res.json();
	console.log("Register response:", data);
	return data;
}

export interface Player {
    id: number | null,
    alias: string,
}
export interface GameInstance {
    type: string;
    matchId: number;
    leftPlayer: Player;
    rightPlayer: Player;
}

// export async function joinRemoteMatch(){
// 	console.log("attempt to join tournamnet");
// 	const res = await authorisedRequest(`/match/join`,{
// 		method: "POST",
// 		headers: {"Content-Type": "application/json"},
// 		body: JSON.stringify({})
// 	})
// 	console.log("Join tournament response:", res);
// 	return res;
// }


export async function getOpenMatches(){
  const res = await authorisedRequest(`/match/remote/open`,{
    method: "GET",
    headers: {"Content-Type": "application/json"},
  });
  const data = await res.json();
  return data;
}

export async function createRemoteMatch(matchName: string){
  return authorisedRequest<{ id: number; name: string; player: Player }>
  (`/match/remote/new`,{
    		method: "POST",
    		headers: {"Content-Type": "application/json"},
    		body: JSON.stringify({ name: matchName })
    	})
}

export async function sendGameToGameEngine(game:GameInstance){
	const res = await fetch (`http://localhost:3003/game/start`, {
		method: "POST",
		headers: {"Content-Type": "application/json" },
		body: JSON.stringify(game)
	});
	// const data = await res.json();
	console.log("Data sent to game engine");
}

