import { Database } from "sqlite3";

export function runMigration1(db: Database) {
  db.run("CREATE TABLE gamer (groupId INT, userId INT, username TEXT, score INT)", (error: any) => {
    console.log('runMigration1: ' + (error ? 'error ' : 'ok'));
  });
}
