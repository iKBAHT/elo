import { Database } from 'sqlite3';

export function runMigration1(db: Database) {
  db.run(
    'CREATE TABLE gamer (groupId INT, userId INT, username TEXT, score INT)',
    (error: any) => {
      console.log('runMigration1: ' + (error ? 'error ' : 'ok'));
    }
  );
}

export function runMigration2(db: Database) {
  db.serialize(() => {
    db.run(`ALTER TABLE gamer ADD COLUMN gamesCount INT DEFAULT 0`, (err) =>
      console.log('add gamesCount:', err ? 'error' : 'ok')
    );

    db.run(`ALTER TABLE gamer ADD COLUMN winsCount INT DEFAULT 0`, (err) =>
      console.log('add winsCount:', err ? 'error' : 'ok')
    );

    db.run(`ALTER TABLE gamer ADD COLUMN marsWinsCount INT DEFAULT 0`, (err) =>
      console.log('add marsWinsCount:', err ? 'error' : 'ok')
    );

    db.run(`ALTER TABLE gamer ADD COLUMN marsLoseCount INT DEFAULT 0`, (err) =>
      console.log('add marsLoseCount:', err ? 'error' : 'ok')
    );

    db.run(`ALTER TABLE gamer ADD COLUMN bestScore INT DEFAULT 0`, (err) =>
      console.log('add bestScore:', err ? 'error' : 'ok')
    );
  });
}

export function runMigration3(db: Database) {
  db.serialize(() => {
    // Rename old table
    db.run(`ALTER TABLE gamer RENAME TO gamer_backup`, (err) => {
      console.log('rename gamer -> gamer_backup:', err ? 'error' : 'ok');
    });

    // Create chat table
    db.run(
      `CREATE TABLE chat (
        id INTEGER PRIMARY KEY,
        title TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      )`,
      (err) => console.log('create chat:', err ? 'error' : 'ok')
    );

    // Create user table
    db.run(
      `CREATE TABLE user (
        id INTEGER PRIMARY KEY,
        username TEXT NOT NULL DEFAULT '',
        first_name TEXT DEFAULT '',
        last_name TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      )`,
      (err) => console.log('create user:', err ? 'error' : 'ok')
    );

    // Create new gamer table
    db.run(
      `CREATE TABLE gamer (
        chat_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        best_score INTEGER NOT NULL,
        games_count INTEGER NOT NULL DEFAULT 0,
        wins_count INTEGER NOT NULL DEFAULT 0,
        mars_wins_count INTEGER NOT NULL DEFAULT 0,
        mars_loses_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (chat_id, user_id),
        FOREIGN KEY (chat_id) REFERENCES chat(id),
        FOREIGN KEY (user_id) REFERENCES user(id)
      )`,
      (err) => console.log('create gamer:', err ? 'error' : 'ok')
    );

    // Create game table
    db.run(
      `CREATE TABLE game (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        winner_user_id INTEGER NOT NULL,
        loser_user_id INTEGER NOT NULL,
        is_mars INTEGER NOT NULL DEFAULT 0,
        winner_score_before INTEGER NOT NULL,
        winner_score_after INTEGER NOT NULL,
        loser_score_before INTEGER NOT NULL,
        loser_score_after INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        FOREIGN KEY (chat_id) REFERENCES chat(id),
        FOREIGN KEY (winner_user_id) REFERENCES user(id),
        FOREIGN KEY (loser_user_id) REFERENCES user(id)
      )`,
      (err) => console.log('create game:', err ? 'error' : 'ok')
    );

    // Migrate unique chats
    db.run(
      `INSERT INTO chat (id, title, created_at, updated_at, deleted_at)
       SELECT DISTINCT groupId,
         CASE
           WHEN groupId = -5209463598 THEN 'Культурные нарды'
           WHEN groupId = -4625700976 THEN '2025 Культурные нарды'
           ELSE ''
         END,
         strftime('%s', 'now'), strftime('%s', 'now'), NULL
       FROM gamer_backup`,
      (err) => console.log('migrate chat:', err ? 'error' : 'ok')
    );

    // Migrate unique users (take last non-empty username per userId)
    db.run(
      `INSERT INTO user (id, username, first_name, last_name, created_at, updated_at, deleted_at)
       SELECT userId, MAX(username), '', '', strftime('%s', 'now'), strftime('%s', 'now'), NULL
       FROM gamer_backup
       GROUP BY userId`,
      (err) => console.log('migrate user:', err ? 'error' : 'ok')
    );

    // Migrate gamers
    db.run(
      `INSERT INTO gamer (chat_id, user_id, score, best_score, games_count, wins_count,
                          mars_wins_count, mars_loses_count, created_at, updated_at, deleted_at)
       SELECT groupId, userId, score, COALESCE(bestScore, score),
              COALESCE(gamesCount, 0), COALESCE(winsCount, 0),
              COALESCE(marsWinsCount, 0), COALESCE(marsLoseCount, 0),
              strftime('%s', 'now'), strftime('%s', 'now'), NULL
       FROM gamer_backup`,
      (err) => console.log('migrate gamer:', err ? 'error' : 'ok')
    );
  });
}

export function runMigration4(db: Database) {
  db.serialize(() => {
    // Rename current gamer table
    db.run(`ALTER TABLE gamer RENAME TO gamer_old`, (err) => {
      console.log('rename gamer -> gamer_old:', err ? 'error' : 'ok');
    });

    // Create new gamer table without aggregates
    db.run(
      `CREATE TABLE gamer (
        chat_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        best_score INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (chat_id, user_id),
        FOREIGN KEY (chat_id) REFERENCES chat(id),
        FOREIGN KEY (user_id) REFERENCES user(id)
      )`,
      (err) => console.log('create gamer (no aggregates):', err ? 'error' : 'ok')
    );

    // Copy data without aggregate columns
    db.run(
      `INSERT INTO gamer (chat_id, user_id, score, best_score, created_at, updated_at, deleted_at)
       SELECT chat_id, user_id, score, best_score, created_at, updated_at, deleted_at
       FROM gamer_old`,
      (err) => console.log('migrate gamer data:', err ? 'error' : 'ok')
    );

    // Drop old tables
    db.run(`DROP TABLE gamer_old`, (err) => {
      console.log('drop gamer_old:', err ? 'error' : 'ok');
    });

    db.run(`DROP TABLE gamer_backup`, (err) => {
      console.log('drop gamer_backup:', err ? 'error' : 'ok');
    });
  });
}
