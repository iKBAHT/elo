export interface IGamer {
  chat_id: number;
  user_id: number;
  score: number;
  best_score: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface IGamerId {
  chat_id: number;
  user_id: number;
}

export interface GamerWithStats {
  chat_id: number;
  user_id: number;
  score: number;
  best_score: number;
  username: string;
  games_count: number;
  wins_count: number;
  mars_wins_count: number;
  mars_loses_count: number;
}
