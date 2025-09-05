"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
//enables verbose debug output
sqlite3_1.default.verbose();
const DBSOURCE = "./data/database.sqlite";
// create connection
exports.db = new sqlite3_1.default.Database(DBSOURCE, (err) => {
    if (err) {
        console.error("Faild to open database :", err.message);
        throw err;
    }
    else {
        console.log("Connected to SQLite");
        // User table
        exports.db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
      )`, (err) => {
            if (err) {
                console.error("Faild to create table \"users:\"", err.message);
            }
            else {
                console.log("✅ Table \"users\" was created or already exists");
            }
        });
    }
});
