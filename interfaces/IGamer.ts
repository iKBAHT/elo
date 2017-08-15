export interface IGamer {
  id: GamerId; // tg user id + tg group id
  userId: number; // tg user id
  username: string; // tg username
  score: number;
}

export type GamerId = string;