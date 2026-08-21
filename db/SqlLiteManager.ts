import { IDb } from './IDb';
import { IChat } from '../interfaces/IChat';
import { IUser } from '../interfaces/IUser';
import { IGamer, IGamerId, GamerWithStats } from '../interfaces/IGamer';
import { IGame } from '../interfaces/IGame';
import { verbose, Database } from 'sqlite3';

const sqlite3: any = verbose();
const file = 'db/elo.db';
export const db: Database = new sqlite3.Database(file);

const noResultMessage = 'no result';

export class SqlLiteManager implements IDb {
  // --- CHAT ---

  upsertChat(chat: IChat): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO chat (id, title, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           updated_at = strftime('%s', 'now')`,
        [chat.id, chat.title, chat.created_at, chat.updated_at, chat.deleted_at],
        (error) => (error ? reject(error) : resolve())
      );
    });
  }

  getChat(id: number): Promise<IChat> {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM chat WHERE id = ? AND deleted_at IS NULL`, [id], (error, row) => {
        if (error) reject(error);
        else if (!row) reject(noResultMessage);
        else resolve(row as IChat);
      });
    });
  }

  // --- USER ---

  upsertUser(user: IUser): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO user (id, username, first_name, last_name, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           username = excluded.username,
           first_name = excluded.first_name,
           last_name = excluded.last_name,
           updated_at = strftime('%s', 'now')`,
        [user.id, user.username, user.first_name, user.last_name, user.created_at, user.updated_at, user.deleted_at],
        (error) => (error ? reject(error) : resolve())
      );
    });
  }

  getUser(id: number): Promise<IUser> {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM user WHERE id = ? AND deleted_at IS NULL`, [id], (error, row) => {
        if (error) reject(error);
        else if (!row) reject(noResultMessage);
        else resolve(row as IUser);
      });
    });
  }

  getUserByUsername(username: string, chatId: number): Promise<IUser> {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT u.* FROM user u
         JOIN gamer g ON g.user_id = u.id
         WHERE UPPER(u.username) = UPPER(?) AND g.chat_id = ? AND g.deleted_at IS NULL`,
        [username, chatId],
        (error, row) => {
          if (error) reject(error);
          else if (!row) reject(noResultMessage);
          else resolve(row as IUser);
        }
      );
    });
  }

  // --- GAMER ---

  createGamer(g: IGamer): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getGamer(g).then(
        () => reject('repeated insertion'),
        (err) => {
          if (err === noResultMessage) {
            db.run(
              `INSERT INTO gamer (chat_id, user_id, score, best_score, created_at, updated_at, deleted_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [g.chat_id, g.user_id, g.score, g.best_score, g.created_at, g.updated_at, g.deleted_at],
              (error) => (error ? reject(error) : resolve())
            );
          } else {
            reject('cannot insert');
          }
        }
      );
    });
  }

  getGamer(id: IGamerId): Promise<IGamer & { username: string }> {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT g.chat_id, g.user_id,
          COALESCE(
            (SELECT CASE
              WHEN game.winner_user_id = g.user_id THEN game.winner_score_after
              WHEN game.loser_user_id = g.user_id THEN game.loser_score_after
            END FROM game
             WHERE game.chat_id = g.chat_id
             AND (game.winner_user_id = g.user_id OR game.loser_user_id = g.user_id)
             AND game.deleted_at IS NULL
             ORDER BY game.id DESC
             LIMIT 1),
            g.score
          ) AS score,
          COALESCE(
            (SELECT MAX(CASE
              WHEN game.winner_user_id = g.user_id THEN game.winner_score_after
              WHEN game.loser_user_id = g.user_id THEN game.loser_score_after
            END) FROM game
             WHERE game.chat_id = g.chat_id
             AND (game.winner_user_id = g.user_id OR game.loser_user_id = g.user_id)
             AND game.deleted_at IS NULL),
            g.best_score
          ) AS best_score,
          g.created_at, g.updated_at, g.deleted_at, u.username
         FROM gamer g
         JOIN user u ON u.id = g.user_id
         WHERE g.chat_id = ? AND g.user_id = ? AND g.deleted_at IS NULL`,
        [id.chat_id, id.user_id],
        (error, row) => {
          if (error) reject(error);
          else if (!row) reject(noResultMessage);
          else resolve(row as IGamer & { username: string });
        }
      );
    });
  }

  getGamerByUsername(username: string, chatId: number): Promise<IGamer & { username: string }> {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT g.chat_id, g.user_id,
          COALESCE(
            (SELECT CASE
              WHEN game.winner_user_id = g.user_id THEN game.winner_score_after
              WHEN game.loser_user_id = g.user_id THEN game.loser_score_after
            END FROM game
             WHERE game.chat_id = g.chat_id
             AND (game.winner_user_id = g.user_id OR game.loser_user_id = g.user_id)
             AND game.deleted_at IS NULL
             ORDER BY game.id DESC
             LIMIT 1),
            g.score
          ) AS score,
          COALESCE(
            (SELECT MAX(CASE
              WHEN game.winner_user_id = g.user_id THEN game.winner_score_after
              WHEN game.loser_user_id = g.user_id THEN game.loser_score_after
            END) FROM game
             WHERE game.chat_id = g.chat_id
             AND (game.winner_user_id = g.user_id OR game.loser_user_id = g.user_id)
             AND game.deleted_at IS NULL),
            g.best_score
          ) AS best_score,
          g.created_at, g.updated_at, g.deleted_at, u.username
         FROM gamer g
         JOIN user u ON u.id = g.user_id
         WHERE UPPER(u.username) = UPPER(?) AND g.chat_id = ? AND g.deleted_at IS NULL`,
        [username, chatId],
        (error, row) => {
          if (error) reject(error);
          else if (!row) reject(noResultMessage);
          else resolve(row as IGamer & { username: string });
        }
      );
    });
  }

  updateGamer(g: IGamer): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE gamer SET
           score = ?,
           updated_at = strftime('%s', 'now')
         WHERE chat_id = ? AND user_id = ?`,
        [g.score, g.chat_id, g.user_id],
        (error) => (error ? reject(error) : resolve())
      );
    });
  }

  getGroupGamers(chatId: number): Promise<Array<GamerWithStats>> {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT g.chat_id, g.user_id,
          COALESCE(
            (SELECT CASE
              WHEN game.winner_user_id = g.user_id THEN game.winner_score_after
              WHEN game.loser_user_id = g.user_id THEN game.loser_score_after
            END FROM game
             WHERE game.chat_id = g.chat_id
             AND (game.winner_user_id = g.user_id OR game.loser_user_id = g.user_id)
             AND game.deleted_at IS NULL
             ORDER BY game.id DESC
             LIMIT 1),
            g.score
          ) AS score,
          COALESCE(
            (SELECT MAX(CASE
              WHEN game.winner_user_id = g.user_id THEN game.winner_score_after
              WHEN game.loser_user_id = g.user_id THEN game.loser_score_after
            END) FROM game
             WHERE game.chat_id = g.chat_id
             AND (game.winner_user_id = g.user_id OR game.loser_user_id = g.user_id)
             AND game.deleted_at IS NULL),
            g.best_score
          ) AS best_score,
          u.username,
          (SELECT COUNT(*) FROM game WHERE game.chat_id = g.chat_id
           AND (game.winner_user_id = g.user_id OR game.loser_user_id = g.user_id)
           AND game.deleted_at IS NULL) AS games_count,
          (SELECT COUNT(*) FROM game WHERE game.chat_id = g.chat_id
           AND game.winner_user_id = g.user_id
           AND game.deleted_at IS NULL) AS wins_count,
          (SELECT COUNT(*) FROM game WHERE game.chat_id = g.chat_id
           AND game.winner_user_id = g.user_id AND game.is_mars = 1
           AND game.deleted_at IS NULL) AS mars_wins_count,
          (SELECT COUNT(*) FROM game WHERE game.chat_id = g.chat_id
           AND game.loser_user_id = g.user_id AND game.is_mars = 1
           AND game.deleted_at IS NULL) AS mars_loses_count
         FROM gamer g
         JOIN user u ON u.id = g.user_id
         WHERE g.chat_id = ? AND g.deleted_at IS NULL
         ORDER BY score DESC`,
        [chatId],
        (error, rows) => {
          if (error) reject(error);
          else resolve(rows as Array<GamerWithStats>);
        }
      );
    });
  }

  getTopGroupGamer(chatId: number): Promise<IGamer & { username: string }> {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT g.chat_id, g.user_id,
          COALESCE(
            (SELECT CASE
              WHEN game.winner_user_id = g.user_id THEN game.winner_score_after
              WHEN game.loser_user_id = g.user_id THEN game.loser_score_after
            END FROM game
             WHERE game.chat_id = g.chat_id
             AND (game.winner_user_id = g.user_id OR game.loser_user_id = g.user_id)
             AND game.deleted_at IS NULL
             ORDER BY game.id DESC
             LIMIT 1),
            g.score
          ) AS score,
          COALESCE(
            (SELECT MAX(CASE
              WHEN game.winner_user_id = g.user_id THEN game.winner_score_after
              WHEN game.loser_user_id = g.user_id THEN game.loser_score_after
            END) FROM game
             WHERE game.chat_id = g.chat_id
             AND (game.winner_user_id = g.user_id OR game.loser_user_id = g.user_id)
             AND game.deleted_at IS NULL),
            g.best_score
          ) AS best_score,
          g.created_at, g.updated_at, g.deleted_at, u.username
         FROM gamer g
         JOIN user u ON u.id = g.user_id
         WHERE g.chat_id = ? AND g.deleted_at IS NULL
         ORDER BY score DESC
         LIMIT 1`,
        [chatId],
        (error, row) => {
          if (error) reject(error);
          else if (!row) reject(noResultMessage);
          else resolve(row as IGamer & { username: string });
        }
      );
    });
  }

  // --- GAME ---

  createGame(game: IGame): Promise<number> {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO game (chat_id, winner_user_id, loser_user_id, declarer_user_id, is_mars,
                           winner_score_before, winner_score_after,
                           loser_score_before, loser_score_after,
                           created_at, updated_at, deleted_at, announcement_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          game.chat_id, game.winner_user_id, game.loser_user_id, game.declarer_user_id, game.is_mars ? 1 : 0,
          game.winner_score_before, game.winner_score_after,
          game.loser_score_before, game.loser_score_after,
          game.created_at, game.updated_at, game.deleted_at, game.announcement_id
        ],
        function(error) {
          if (error) reject(error);
          else resolve(this.lastID);
        }
      );
    });
  }

  updateGameAnnouncement(gameId: number, announcementId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE game SET announcement_id = ?, updated_at = strftime('%s', 'now') WHERE id = ?`,
        [announcementId, gameId],
        (error) => (error ? reject(error) : resolve())
      );
    });
  }

  getLatestGameByDeclarer(chatId: number, userId: number): Promise<IGame | null> {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM game WHERE chat_id = ? AND declarer_user_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`,
        [chatId, userId],
        (error, row) => {
          if (error) reject(error);
          else resolve(row as IGame | null);
        }
      );
    });
  }

  getLatestDeletedGameByDeclarer(chatId: number, userId: number): Promise<IGame | null> {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM game WHERE chat_id = ? AND declarer_user_id = ? AND deleted_at IS NOT NULL ORDER BY id DESC LIMIT 1`,
        [chatId, userId],
        (error, row) => {
          if (error) reject(error);
          else resolve(row as IGame | null);
        }
      );
    });
  }

  softDeleteGame(gameId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE game SET deleted_at = strftime('%s', 'now'), updated_at = strftime('%s', 'now') WHERE id = ?`,
        [gameId],
        (error) => (error ? reject(error) : resolve())
      );
    });
  }

  undeleteGame(gameId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE game SET deleted_at = NULL, updated_at = strftime('%s', 'now') WHERE id = ?`,
        [gameId],
        (error) => (error ? reject(error) : resolve())
      );
    });
  }

  getGamesByChat(chatId: number): Promise<Array<IGame>> {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM game WHERE chat_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
        [chatId],
        (error, rows) => {
          if (error) reject(error);
          else resolve(rows as Array<IGame>);
        }
      );
    });
  }
}
