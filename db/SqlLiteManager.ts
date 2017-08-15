import { IDb } from "./IDb";
import { IGamer } from "../interfaces/IGamer";
import { verbose, Database } from 'sqlite3';
import { runMigration1 } from "./migration";
const sqlite3: any = verbose();
const file = 'db/elo.db';
const db: Database = new sqlite3.Database(file);

// runMigration1(db);

export class SqlLiteManager implements IDb {
  start(g: IGamer): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run("INSERT INTO gamer VALUES(?, ?, ?, ?)", [g.id, g.userId, g.username, g.score], (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    })
  }
}
