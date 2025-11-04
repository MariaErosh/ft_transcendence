export interface Match {
	id: number,
	status: string,
	type: string
}

export interface Player{
	id: number,
	auth_user_id: number | null,
	alias: string,
	match_id: number,
	status: string,
}

export interface Game {
	id: number,
	left_player_id: number,
	right_player_id: number,
	match_id: number
}

export interface PlayerPayload {
	auth_user_id: number | null,
	alias: string,
}

export interface CreateMatchPayload{
	type: string;
	players: PlayerPayload[];
}

export interface GamePayload{
	type: string;
	matchId: number;
	leftPlayer: PlayerPayload;
	rightPlayer: PlayerPayload;
}
