this.db.getGroupGamers(-4625700976).then((gamers) => console.log(gamers));

this.db.deleteGamer(-4625700976, "stanislove_dr").then((gamers) => console.log(gamers));

//     DELETE FROM users
// WHERE rowid = (
//   SELECT rowid FROM users
//   WHERE name = 'Иван'
//   LIMIT 1
// );