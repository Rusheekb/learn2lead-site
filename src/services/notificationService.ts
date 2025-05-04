
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notificationTypes';
import { toast } from 'sonner';

/**
 * Fetches all notifications for the current user
 */
export const fetchNotifications = async (): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data as Notification[];
  } catch (error) {
    console.error('Error in fetchNotifications:', error);
    return [];
  }
};

/**
 * Invokes the Edge Function to check for upcoming classes
 * and generate notifications
 */
export const checkUpcomingClasses = async (): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('check-upcoming-classes');
    
    if (error) {
      console.error('Error checking upcoming classes:', error);
      return;
    }
    
    console.log('Checked for upcoming classes:', data);
  } catch (error) {
    console.error('Error invoking check-upcoming-classes function:', error);
    // Don't show toast for background processes
  }
};

/**
 * Marks a notification as read
 */
export const markNotificationAsRead = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    return false;
  }
};

/**
 * Marks all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .is('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
      return false;
    }

    toast.success('All notifications marked as read');
    return true;
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    toast.error('Failed to mark all notifications as read');
    return false;
  }
};
