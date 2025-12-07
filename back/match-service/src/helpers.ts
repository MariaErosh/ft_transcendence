import sqlite3 from "sqlite3";


export function dbGet<T = any>(
	db: sqlite3.Database,
	query: string,
	params: any [] = []
): Promise <T | undefined> {
	return new Promise((resolve, reject) =>
	{
		db.get(query, params, (error, row)=>{
		if (error) reject(error);
		else resolve (row as T | undefined);
	});
});
}

export function dbAll<T = any>(
	db: sqlite3.Database,
	query: string,
	params: any [] = []
): Promise <T[]> {
	return new Promise((resolve, reject) =>
	{
		db.all(query, params, (error, rows)=>{
		if (error) reject(error);
		else resolve (rows as T[]);
	});
});
}

export function dbRunQuery(
	db: sqlite3.Database,
	query: string,
	params: any [] = []
): Promise<void> {
	return new Promise((resolve, reject) => {
			db.run(query, params, (err) => {
				if (err) return reject(err);
				resolve();
			});
		});
}

export function shuffle<T>(array: T[]): T[] {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = array[i]!;
		array[i] = array[j]!;
		array[j] = temp;
	}
	return array;
}
