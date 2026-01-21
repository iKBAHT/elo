export interface IGamer extends IGamerId {
  username: string; // tg username
  score: number;
  gamesCount: number;
  winsCount: number;
  marsWinsCount: number;
  marsLoseCount: number;
  bestScore: number;
}

export interface IGamerId {
  groupId: number; // tg group id
  userId: number; // tg user id
}
