
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notificationTypes';
import { toast } from 'sonner';

/**
 * Fetches notifications for the current user
 */
export const fetchNotifications = async (): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

/**
 * Marks a notification as read
 */
export const markNotificationRead = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    toast.error('Failed to mark notification as read');
    return false;
  }
};

/**
 * Marks all notifications as read for the current user
 */
export const markAllNotificationsRead = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false);

    if (error) {
      throw error;
    }

    return true;
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    toast.error('Failed to mark all notifications as read');
    return false;
  }
};

/**
 * Manually trigger notification check (for development/testing)
 */
export const checkUpcomingClasses = async (): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('check-upcoming-classes');
    
    if (error) {
      throw error;
    }
    
    console.log('Checked upcoming classes:', data);
  } catch (error) {
    console.error('Error checking upcoming classes:', error);
  }
};
