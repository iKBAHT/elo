import { runMigration1, runMigration2 } from './db/migration';
import { db } from './db/SqlLiteManager';

const command = process.argv[2];
console.log('command', command);
switch (command) {
  case 'migration1':
    runMigration1(db);
    break;
  case 'migration2':
    runMigration2(db);
    break;
}
