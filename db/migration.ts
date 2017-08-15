import { Database } from "sqlite3";

export function runMigration1(db: Database) {
  db.run("CREATE TABLE gamer (id TEXT, userId INT, username TEXT, score INT)", (params: any) => {
    console.log(params);
  });
}
