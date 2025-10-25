import { describe, it, expect, test, beforeAll, afterAll } from '@jest/globals'
import { createTestDb, closeTestDb } from './test-database';
import { initDB } from '../src/db/database'
import sqlite3 from 'sqlite3';
import { MatchService } from '../src/match-service'
import { beforeEach } from 'node:test';
import { Match } from '../models';
import { dbGet } from './helpers';


describe
  ('database tests', () => {
    let db: sqlite3.Database;
    let matchService: MatchService;

    beforeAll(async () => {
      db = createTestDb();
      await initDB(db);
      matchService = new MatchService(db);
    });

    afterAll(async () => {
      await closeTestDb(db);
    })

    beforeEach( () => {
      db.run ('DELETE FROM matches; DELETE FROM players; DELETE FROM games', (err) => {
        if (err) console.log ("Error cleaning test db ", err);
        else console.log ("test db cleaned");
      })
    })

    test('adds a new match to the match table', async () => {
      const id =  await matchService.addMatchRow();
      const match = await dbGet<Match>(db, 'SELECT * FROM matches WHERE id = ?', [id]);
      expect(match).toBeDefined();
      expect(match!.status).toBe("IN PROGRESS");
    });
  })