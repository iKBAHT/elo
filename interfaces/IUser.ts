export interface IUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}
