"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.initDB = initDB;
const sqlite3_1 = __importDefault(require("sqlite3"));
// Enables verbose debug output
sqlite3_1.default.verbose();
// Path to the "data" directory where the SQLite database will be stored
//const dataDir = path.resolve(__dirname, "../data");
//const dbFile = path.join(dataDir, "auth.sqlite");
const DBSOURCE = "./data/database.sqlite";
// Create connection
exports.db = new sqlite3_1.default.Database(DBSOURCE, (err) => {
    if (err) {
        console.error("Failed to open database:", err.message);
    }
    else {
        console.log("Connected to SQLite database at", DBSOURCE);
    }
});
function initDB() {
    exports.db.serialize(() => {
        exports.db.run(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			two_factor_secret TEXT,
			two_factor_enabled BOOLEAN DEFAULT 0
		)
    `, (err) => {
            if (err) {
                console.error('Failed to create "users" table:', err.message);
            }
            else {
                console.log('"users" table created or already exists');
            }
        });
        exports.db.run(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
	  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    `, (err) => {
            if (err) {
                console.error('Failed to create "refresh_tokens" table:', err.message);
            }
            else {
                console.log('"refresh_tokens" table created or already exists');
            }
        });
    });
}
