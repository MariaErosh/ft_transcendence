// Profile type definitions

export interface UserProfile {
  id: number;
  user_id: number;
  username: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  status: string;
  games_played: number;
  games_won: number;
  created_at: string;
  updated_at: string;
}
