let accessToken: string | null = null;
let tempAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
	accessToken = token;
}

export function setTempAccessToken(token: string | null) {
	tempAccessToken = token;
}

export function getAccessToken() {
	return accessToken;
}

export function getTempAccessToken() {
	return tempAccessToken;
}

export async function refreshAccessToken(): Promise<boolean> {
	try {
		const res = await fetch("/api/auth/refresh", {
			method: "POST",
			credentials: "include", //send HttpOnly refresh cookie
		});
		if (!res.ok) {
			accessToken = null;
			return false;
		}
		const json = await res.json();
		accessToken = json.accessToken ?? null;
		return !!accessToken;
	} catch (err) {
		accessToken = null;
		return false;
	}
}

export async function fetchAuth(input: RequestInfo, init: RequestInit = {}) {
	if (!accessToken) {
		await refreshAccessToken();
	}
	const headers = { ...(init.headers || {}) } as Record<string,string>;
	if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
	headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
	return fetch(input, { ...init, credentials: "include", headers });
}
