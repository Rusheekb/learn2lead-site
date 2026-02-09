export type AppRole = 'student' | 'tutor' | 'admin';

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
  bio: string | null;
  avatar_url: string | null;
  zoom_link: string | null;
  created_at: string;
  updated_at: string;
}
