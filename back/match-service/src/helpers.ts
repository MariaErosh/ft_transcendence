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
