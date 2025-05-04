
export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  related_id?: string | null;
  read: boolean;
  created_at: string;
}
