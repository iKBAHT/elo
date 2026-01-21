import { IDb } from './IDb';
import { IGamer, IGamerId } from '../interfaces/IGamer';
import { verbose, Database } from 'sqlite3';
const sqlite3: any = verbose();
const file = 'db/elo.db';
export const db: Database = new sqlite3.Database(file);

const noResultMessage = 'no result';

export class SqlLiteManager implements IDb {
  create(g: IGamer): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getGamer(g).then(
        () => {
          reject('repeated insertion');
        },
        (err) => {
          if (err === noResultMessage) {
            db.run(
              'INSERT INTO gamer VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [
                g.groupId,
                g.userId,
                g.username,
                g.score,
                g.gamesCount,
                g.winsCount,
                g.marsWinsCount,
                g.marsLoseCount,
                g.bestScore
              ],
              (error) => {
                if (error) {
                  reject(error);
                } else {
                  resolve();
                }
              }
            );
          } else {
            reject('cannot insert');
          }
        }
      );
    });
  }

  updateGamer(g: IGamer): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE gamer 
        SET score = ?, gamesCount = ?, winsCount = ?, marsWinsCount = ?, marsLoseCount = ?, bestScore = ? 
        WHERE groupId = ? AND userId = ?`,
        [
          g.score,
          g.gamesCount,
          g.winsCount,
          g.marsWinsCount,
          g.marsLoseCount,
          g.bestScore,
          g.groupId,
          g.userId
        ],
        (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        }
      );
    });
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
            resolve(rows[0] as any);
          }
        }
      );
    });
  }

  getGamerByUsername(groupId: number, username: string): Promise<IGamer> {
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
            resolve(rows[0] as any);
          }
        }
      );
    });
  }

  getGroupGamers(groupId: number): Promise<Array<IGamer>> {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM gamer WHERE groupId = ${groupId} ORDER BY score DESC`,
        (error, rows) => {
          if (error) {
            reject(error);
          } else {
            resolve(rows as any);
          }
        }
      );
    });
  }

  getTopGroupGamer(groupId: number): Promise<IGamer> {
    return this.getGroupGamers(groupId).then((gamers) => gamers[0]);
  }

  deleteGamer(groupId: number, username: string): Promise<IGamer> {
    return new Promise((resolve, reject) => {
      db.all(
        `DELETE FROM gamer WHERE rowid = (
            SELECT rowid FROM gamer
            WHERE UPPER(username) = UPPER(?) AND groupId = ${groupId}
            LIMIT 1
        ) `,
        [username],
        (error, rows) => {
          console.log(error);
          console.log(rows);
          if (error) {
            reject(error);
          } else if (rows.length !== 1) {
            reject(rows.length ? 'to many results' : noResultMessage);
          } else {
            resolve(rows[0] as any);
          }
        }
      );
    });
  }
}
