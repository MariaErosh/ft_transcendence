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

export async function tempTokenRequest<T=any>(url: string, options: ApiRequestOptions = {}) {
  const accessToken = localStorage.getItem("tempToken");

  options.headers = {
    ...(options.headers || {}),
    "Authorization": `Bearer ${accessToken}`,
  };

  let res = await fetch(`${BASE_URL}${url}`, options);

  const data = await res.json();
  console.log("Result in tempTokenRequest:", data);
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
    if (data.status === "onboarding_2fa") {
      localStorage.setItem("tempToken", data.accessToken);
      return data;
    }
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("refreshExpiresAt", data.refreshExpiresAt);
  }
  return data;
}

export async function verify2FA(userId: number, token: string) {
  const res = await fetch(`${BASE_URL}/auth/2fa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, token }),
  });
  return res.json();
}

export async function register(username: string, password: string, tfa: boolean) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, tfa }),
  });
  //return res.json();
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
    return res;
}

export async function set2FAenabled(userId: number, username: string){
  const res = await tempTokenRequest(`/auth/2fa/set`, {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, userId})
    });
    return res;
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

export async function getOpenMatches(): Promise<string[]> {
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
	const res = await fetch (`http://localhost:3003/game/start`, {
		method: "POST",
		headers: {"Content-Type": "application/json" },
		body: JSON.stringify(game)
	});
	console.log("Data sent to game engine");
}

export async function userLoggedIn(){
  const res = await authorisedRequest("/check", {method: "GET"});
  return res.ok;
}