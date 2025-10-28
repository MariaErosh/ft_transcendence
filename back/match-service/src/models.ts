export interface Match {
	id: number,
	status: string
}

export interface Player{
	id: number,
	auth_user_id: number, 
	alias: string,
	match_id: number,
	status: string,
	remote: number
}

export interface Game {
	id: number,
	left_player_id: number,
	right_player_id: number,
	match_id: number
}