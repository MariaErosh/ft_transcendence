import { getAccessToken, getTempAccessToken, refreshAccessToken } from "./auth.js";
const BASE_URL = "/api";

interface ApiRequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

interface RefreshResponse {
  accessToken?: string;
  refreshToken?: string;
  refreshExpiresAt?: string;
}


export async function authorisedRequest<T=any>(url: string, options: ApiRequestOptions = {}) {
  let token = getAccessToken();
  if (!token) {
    const refreshed = await refreshAccessToken();
    if (refreshed)
      token = getAccessToken();
  }

  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  if (token)
    headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: "include", // send refresh cookie
  });

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) return res;

    const retryToken = getAccessToken();
    if (retryToken)
      headers["Authorization"] = `Bearer ${retryToken}`;

    return fetch(`${BASE_URL}${url}`, {
      ...options,
      headers,
      credentials: "include",
    });
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`request failed: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function tempTokenRequest(url: string, options: ApiRequestOptions = {}): Promise<Response> {

  const token = getTempAccessToken();
  
  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };
  if (token) 
      headers["Authorization"] = `Bearer ${token}`;
  
  return fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: "include",
  });
}


export async function login(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // allow refresh cookie
    body: JSON.stringify({ username, password }),
  });

  return res.json();
}

export async function logoutRequest() {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
}

export async function verify2FA(userId: number, token: string) {
  const res = await fetch(`${BASE_URL}/auth/2fa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, token }),
  });
  const data  = await res.json();
  return {success: res.ok, data: data};
}

export async function register(username: string,  email: string, password: string, tfa: boolean) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username,  email, password, tfa }),
  });
  const data = await res.json();
  console.log("Register response:", data);
  return data;
}

export async function enable2FA(userId: number, username: string) {
  const res = await tempTokenRequest(`/auth/2fa/enable`, {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, userId})
    });
    if (!res.ok) throw new Error("Failed to enable 2FA");
  
    const data = await res.json();
    return data;
}

export async function set2FAenabled(userId: number, username: string){
  const res = await tempTokenRequest(`/auth/2fa/set`, {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, userId})
    });
    if (!res.ok) throw new Error("Failed to set 2FA enabled");
  
    const data = await res.json();
    return data;
}

interface CreateMatchPayload{
	type: string;
	players: Player[];
	owner: string | null;
	name: string | null
}

export async function createConsoleMatch(aliases:string[], name:string, owner: string) {
	const players: Player[] = aliases.map(alias => ({
		id: null,
		alias
	}));

	const payload: CreateMatchPayload = {
		type: "CONSOLE",
		players,
		owner: owner,
		name: name
	};

	const res = await fetch(`${BASE_URL}/match/new`, {
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

export async function getOpenMatches(): Promise< {name: string; started: boolean }[]> {
	try {
		const response = await fetch(`${BASE_URL}/open`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json"
			}
		});
		if (!response.ok) {
			throw new Error(`Failed to fetch matches: ${response.status}`);
		}
		const data = await response.json();
		return data.matches || [];
	} catch (err) {
		console.error("Error fetching open matches:", err);
		return [];
	}
}

export async function getMatchPlayers(matchName: string): Promise <string[]>{
	try{
		const response = await fetch(`${BASE_URL}/players`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({matchName})
		})
		if (!response.ok) {
			throw new Error(`Failed to fetch match players: ${response.status}`);
		}
		const data = await response.json();
		return data.players || [];
	} catch (err){
		console.error("Error fetching match players: ", err);
		return[];
	}
}

export async function sendGameToGameEngine(game:GameInstance){
  await authorisedRequest(`/game/start`, {
		method: "POST",
		headers: {"Content-Type": "application/json" },
		body: JSON.stringify(game)
	});
	console.log("Data sent to game engine");
}



// export async function sendGameToGameEngine(game:GameInstance){
// 	const res = await fetch (`http://localhost:3003/game/start`, {
// 		method: "POST",
// 		headers: {"Content-Type": "application/json" },
// 		body: JSON.stringify(game)
// 	});
// 	console.log("Data sent to game engine");
// }

export async function userLoggedIn(){
  const res = await authorisedRequest(`/check`, {method: "GET"});
  return res.ok;
}
