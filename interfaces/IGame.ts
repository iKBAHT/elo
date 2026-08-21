export interface IGame {
  id: number;
  chat_id: number;
  winner_user_id: number;
  loser_user_id: number;
  declarer_user_id: number;
  is_mars: boolean;
  winner_score_before: number;
  winner_score_after: number;
  loser_score_before: number;
  loser_score_after: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  announcement_id: number;
}
