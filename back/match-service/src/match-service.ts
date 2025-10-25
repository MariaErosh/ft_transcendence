import { resolve } from "path";
import { Database } from "sqlite3";

interface InputPlayer{
	auth_user_id: number, 
	alias: string, 
	remote: number
}

export class MatchService {
	constructor (private db: Database) {}

	async addMatchRow(){
		return new Promise<number>((resolve, reject) => {
			this.db.run("INSERT INTO matches (status) VALUES ('IN PROGRESS')",
		function(err){
			if (err){ return reject(err)};
			resolve(this.lastID);
		});
		})
	}

	async addPlayer(player: InputPlayer){}

}