import sqlite3 from "sqlite3";
// @ts-ignore
import logger from "../../../../observability/dist/log/logger";
import {
  dbQueryDuration,
  dbErrors,
} from "../../../../observability/dist/metrics/metrics";
import path from "path";

// Enables verbose debug output
sqlite3.verbose();

// Path to the "data" directory where the SQLite database will be stored
//const dataDir = path.resolve(__dirname, "../data");
//const dbFile = path.join(dataDir, "auth.sqlite");
const DBSOURCE = "./data/database.sqlite";

// Create connection
export const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    console.error("Failed to open database:", err.message);
    logger.error("Failed to open database:", { error: err.message });
    dbErrors.labels("connection", process.env.SERVICE_NAME).inc();
  } else {
    console.log("Connected to SQLite database at", DBSOURCE);
    logger.info("Connected to SQLite database", { path: DBSOURCE });
  }
});

export function initDB() {
  db.serialize(() => {
    db.run(
      `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        two_factor_secret TEXT,
        two_factor_enabled BOOLEAN DEFAULT 0
      )
      `,
      (err) => {
        const startTime = Date.now();
        const duration = (Date.now() - startTime) / 1000;

        if (err) {
          console.error('Failed to create "users" table:', err.message);
          logger.error('Failed to create "users" table:', { error: err.message });
          dbErrors.labels("create_table", process.env.SERVICE_NAME).inc();
        } else {
          console.log('"users" table created or already exists');
          logger.info('"users" table created or already exists');
          dbQueryDuration.labels("create_table", process.env.SERVICE_NAME).observe(duration);
        }
      }
    );

    db.run(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        `
        , (err) => {
            const startTime = Date.now();
            const duration = (Date.now() - startTime) / 1000;

            if (err) {
                console.error('Failed to create "refresh_tokens" table:', err.message);
                logger.error('Failed to create "refresh_tokens" table:', { error: err.message });
                dbErrors.labels("create_table", process.env.SERVICE_NAME).inc();
            } else {
                console.log('"refresh_tokens" table created or already exists');
                logger.info('"refresh_tokens" table created or already exists');
                dbQueryDuration.labels("create_table", process.env.SERVICE_NAME).observe(duration);
            }
        }
    );

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
        `
        , (err) => {
            const startTime = Date.now();
            const duration = (Date.now() - startTime) / 1000;

            if (err) {
                console.error('Failed to create index:', err.message);
                logger.error('Failed to create index:', { error: err.message });
                dbErrors.labels("create_index", process.env.SERVICE_NAME).inc();
            } else {
                console.log('Index idx_refresh_tokens_user_id created or already exist');
                logger.info('Index created or already exist');
                dbQueryDuration.labels("create_index", process.env.SERVICE_NAME).observe(duration);
            }
        }
    );
 });
}
