import { describe, it, expect, test, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createTestDb, closeTestDb, clearDB } from './test-database';
import { initDB } from '../src/db/database'
import sqlite3 from 'sqlite3';
import { MatchService } from '../src/match-service'
import { Match, Player } from '../src/models';
import { dbAll, dbGet } from '../src/helpers';
import { exec } from 'child_process';
import { InputPlayer } from '../src/models';


describe
	('database tests', () => {
		let db: sqlite3.Database;
		let matchService: MatchService;

		beforeAll(async () => {
			db = createTestDb();
			await initDB(db);
			matchService = new MatchService(db);
			const playersTable = db.run('PRAGMA table_info(players)', (err) => {
				if (err) console.log("Error getting the players table");
				else console.log("Players table retrieved");
			})
			console.log(playersTable);
		});

		afterAll(async () => {
			await closeTestDb(db);
		})

		test('adds a new match to the match table', async () => {
			const id = await matchService.addMatchRow();
			const match = await dbGet<Match>(db, 'SELECT * FROM matches WHERE id = ?', [id]);
			expect(match).toBeDefined();
			expect(match!.status).toBe("IN PROGRESS");
		});

		test('add a new player to the players table', async () => {
			let player: InputPlayer
			player = { auth_user_id: 12, alias: "test player", remote: 0 }
			const id = await matchService.addPlayer(player, 12);
			const playerRow = await dbGet<Player>(db, "SELECT * FROM players WHERE id = ?", [id]);
			expect(playerRow).toBeDefined();
			expect(playerRow?.alias).toBe(player.alias);
			expect(playerRow?.status).toBe("NOT PLAYED");

			//expected to throw, because alias should be unique
			await expect(matchService.addPlayer(player, 13)).rejects.toThrow();
		})

		test('create a new tournament and get two new players', async () => {
			await clearDB(db);
			let player1: InputPlayer = { auth_user_id: 11, alias: "test player 1", remote: 0 };
			let player2: InputPlayer = { auth_user_id: 13, alias: "test player 2", remote: 0 };
			let player3: InputPlayer = { auth_user_id: 14, alias: "test player3", remote: 0 };
			const id = await matchService.createNewMatch([player1, player2, player3]);
			const rows = await dbAll(db, "SELECT * FROM players WHERE match_id = ?", [id]);
			expect(rows.length).toBe(3);

			const newPair = await matchService.getNextPlayers(id);
			expect(newPair.length).toBe(2);
		})

		test('get a last winning player', async () => {
			await clearDB(db);
			let player1: InputPlayer = { auth_user_id: 11, alias: "test player 1", remote: 0 };
			let player2: InputPlayer = { auth_user_id: 13, alias: "test player 2", remote: 0 };
			let player3: InputPlayer = { auth_user_id: 14, alias: "test player3", remote: 0 };
			const id = await matchService.createNewMatch([player1, player2, player3]);
			const rows = await dbAll(db, "SELECT * FROM players WHERE match_id = ?", [id]);
			expect(rows.length).toBe(3);
			await matchService.setPlayerStatus(rows[0].id, "LOST");
			await matchService.setPlayerStatus(rows[1].id, "LOST");
			console.log(rows);

			const newPair = await matchService.getNextPlayers(id);
			console.log("New pair: ", newPair, "New pair lenght: ", newPair.length);
			expect(newPair.length).toBe(1);
		})

		test('start a new round and get pair of players', async () => {
			await clearDB(db);
			let player1: InputPlayer = { auth_user_id: 11, alias: "test player 1", remote: 0 };
			let player2: InputPlayer = { auth_user_id: 13, alias: "test player 2", remote: 0 };
			let player3: InputPlayer = { auth_user_id: 14, alias: "test player3", remote: 0 };
			const id = await matchService.createNewMatch([player1, player2, player3]);
			const rows = await dbAll(db, "SELECT * FROM players WHERE match_id = ?", [id]);
			expect(rows.length).toBe(3);
			await matchService.setPlayerStatus(rows[0].id, "WON");
			await matchService.setPlayerStatus(rows[1].id, "LOST");

			const newPair = await matchService.getNextPlayers(id);
			expect(newPair.length).toBe(2);
		})

		test('start a new round and get pair of players', async () => {
			await clearDB(db);
			let player1: InputPlayer = { auth_user_id: 11, alias: "test player 1", remote: 0 };
			let player2: InputPlayer = { auth_user_id: 13, alias: "test player 2", remote: 0 };
			let player3: InputPlayer = { auth_user_id: 14, alias: "test player3", remote: 0 };
			let player4: InputPlayer = { auth_user_id: 15, alias: "test player4", remote: 0 };
			const id = await matchService.createNewMatch([player1, player2, player3, player4]);
			const rows = await dbAll(db, "SELECT * FROM players WHERE match_id = ?", [id]);
			expect(rows.length).toBe(4);
			await matchService.setPlayerStatus(rows[0].id, "WON");
			await matchService.setPlayerStatus(rows[1].id, "LOST");
			await matchService.setPlayerStatus(rows[2].id, "WON");

			const newPair = await matchService.getNextPlayers(id);
			expect(newPair.length).toBe(2);
		})

		test('start a new round and get the one winner', async () => {
			await clearDB(db);
			let player1: InputPlayer = { auth_user_id: 11, alias: "test player 1", remote: 0 };
			let player2: InputPlayer = { auth_user_id: 13, alias: "test player 2", remote: 0 };
			let player3: InputPlayer = { auth_user_id: 14, alias: "test player3", remote: 0 };
			let player4: InputPlayer = { auth_user_id: 15, alias: "test player4", remote: 0 };
			const id = await matchService.createNewMatch([player1, player2, player3, player4]);
			const rows = await dbAll(db, "SELECT * FROM players WHERE match_id = ?", [id]);
			expect(rows.length).toBe(4);
			await matchService.setPlayerStatus(rows[0].id, "WON");
			await matchService.setPlayerStatus(rows[1].id, "LOST");
			await matchService.setPlayerStatus(rows[2].id, "LOST");
			await matchService.setPlayerStatus(rows[3].id, "LOST");

			const newPair = await matchService.getNextPlayers(id);
			expect(newPair.length).toBe(1);
		})

		test('record match results', async () => {
			await clearDB(db);
			let player1: InputPlayer = { auth_user_id: 11, alias: "test player 1", remote: 0 };
			let player2: InputPlayer = { auth_user_id: 13, alias: "test player 2", remote: 0 };
			const id = await matchService.createNewMatch([player1, player2,]);
			const rows = await dbAll(db, "SELECT * FROM players");
			expect(rows.length).toBe(2);
			const idLoser = rows[0].id;
			const idWinner = rows[1].id;

			await matchService.recordGameResults(idLoser, idWinner);

			const updatedLoser = await dbAll(db, "SELECT * FROM players WHERE status = 'LOST'");
			const updatedWinner = await dbAll(db, "SELECT * FROM players WHERE status = 'WON'");

			expect(updatedLoser.length).toBe(1);
			expect(updatedLoser[0].status).toBe("LOST");
			expect(updatedWinner.length).toBe(1);
			expect(updatedWinner[0].status).toBe("WON");
		})
	})
