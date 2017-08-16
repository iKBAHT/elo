import { IDb } from "./IDb";
import { IGamer, IGamerId } from "../interfaces/IGamer";
import { verbose, Database } from 'sqlite3';
import { runMigration1 } from "./migration";
const sqlite3: any = verbose();
const file = 'db/elo.db';
const db: Database = new sqlite3.Database(file);

// runMigration1(db);
const noResultMessage = 'no result';

export class SqlLiteManager implements IDb {
  start(g: IGamer): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getGamer(g).then(
        () => { 
          reject('repeated insertion');
        },
        (err) => { 
          if (err === noResultMessage) {
            db.run(
              'INSERT INTO gamer VALUES(?, ?, ?, ?)',
              [g.groupId, g.userId, g.username, g.score],
              (error) => {
                if (error) {
                  reject(error);
                } else {
                  resolve();
                }
              });
          } else {
            reject('cannot insert');
          }
        }
      );
    })
  }

  getGamer(gamerId: IGamerId): Promise<IGamer> {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM gamer WHERE groupId = ${gamerId.groupId} AND userId = ${gamerId.userId}`,
        (error, rows) => {
          if (error) {
            reject(error);
          } else if (rows.length !== 1) {
            reject(rows.length ? 'to many results' : noResultMessage);
          } else {
            resolve(rows[0]);
          }
        });
    })
  }

  getGamerByUsername(groupId: number, username: string): Promise<IGamer> {
    console.log(groupId);
    console.log(username);
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM gamer WHERE UPPER(username) = UPPER(?) AND groupId = ${groupId}`,
        [username],
        (error, rows) => {
          if (error) {
            reject(error);
          } else if (rows.length !== 1) {
            reject(rows.length ? 'to many results' : noResultMessage);
          } else {
            resolve(rows[0]);
          }
        });
    })
  }

  getGroupGamers(groupId: number): Promise<Array<IGamer>> {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM gamer WHERE groupId = ${groupId} ORDER BY score`,
        (error, rows) => {
          if (error) {
            reject(error);
          } else {
            resolve(rows);
          }
        });
    })
  }
}
