
export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  related_id?: string;
  read: boolean;
  created_at: string;
}
