import { describe, it, expect, test, beforeAll, afterAll } from '@jest/globals'
import { createTestDb, closeTestDb } from './test-database';
import { initDB } from '../src/db/database'
import sqlite3 from 'sqlite3';
import { InputPlayer, MatchService } from '../src/match-service'
import { beforeEach } from 'node:test';
import { Match, Player } from '../models';
import { dbGet } from './helpers';


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

    beforeEach(async () => {
      await new Promise<void>((resolve, reject) => {
        db.exec('DELETE FROM matches; DELETE FROM players; DELETE FROM games', (err) => {
          if (err) reject(err);
          else resolve();
        })
      })
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
  })