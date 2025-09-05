import sqlite3 from "sqlite3";

//enables verbose debug output
sqlite3.verbose();

const DBSOURCE = "./data/database.sqlite";

// create connection
export const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    console.error("Faild to open database :", err.message);
    throw err;
  } else {
    console.log("Connected to SQLite");

    // User table
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
      )`,
      (err) => {
        if (err) {
          console.error("Faild to create table \"users:\"", err.message);
        } else {
          console.log("✅ Table \"users\" was created or already exists");
        }
      }
    );
  }
});
