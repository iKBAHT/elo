export interface IGamer extends IGamerId {
  groupId: number; // tg group id
  userId: number; // tg user id
  username: string; // tg username
  score: number;
}

export interface IGamerId {
  groupId: number; // tg group id
  userId: number; // tg user id
}
