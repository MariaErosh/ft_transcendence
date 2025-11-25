export interface Match {
	id: number,
	status: string,
	type: string
}

export interface Player{
	id: number,
	user_id: number | null,
	alias: string,
	match_id: number,
	status: string,
}

export interface PlayerPayload {
	id: number | null,
	alias: string,
}

export interface CreateMatchPayload{
	type: string;
	name: string | null;
	players: PlayerPayload[];
}

export interface GamePayload{
	type: string;
	gameId: number;
	leftPlayer: PlayerPayload;
	rightPlayer: PlayerPayload;
}

export interface resultPayload{
	gameId: number;
	winner: PlayerPayload;
	loser: PlayerPayload
}

