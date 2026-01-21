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
