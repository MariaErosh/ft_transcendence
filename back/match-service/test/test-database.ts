import sqlite3 from "sqlite3";

export function createTestDb(): sqlite3.Database {
	return new sqlite3.Database(':memory:', (err) => {
		if (err) console.log('failed to create test database: ${err}');
		else console.log('created a test database');
	});
}

export function closeTestDb(db: sqlite3.Database): Promise <void> {
	return new Promise( (resolve, reject) => {
		db.close((err)=>{
			if (err){
				console.log("could not close test db: ", err);
				reject(err);
			}
			else{
				console.log("Test db colsed");
				resolve();
			} 
		})
	})
}