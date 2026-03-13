
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notificationTypes';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const log = logger.create('notifications');

export const fetchNotifications = async (): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Error fetching notifications', error);
      return [];
    }

    return data as Notification[];
  } catch (error) {
    log.error('Error in fetchNotifications', error);
    return [];
  }
};

export const checkUpcomingClasses = async (): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('check-upcoming-classes');
    
    if (error) {
      log.error('Error checking upcoming classes', error);
      return;
    }
    
    log.debug('Checked for upcoming classes', { data });
  } catch (error) {
    log.error('Error invoking check-upcoming-classes function', error);
  }
};

export const markNotificationAsRead = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) {
      log.error('Error marking notification as read', error);
      return false;
    }

    return true;
  } catch (error) {
    log.error('Error in markNotificationAsRead', error);
    return false;
  }
};

export const markAllNotificationsAsRead = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .is('read', false);

    if (error) {
      log.error('Error marking all notifications as read', error);
      toast.error('Failed to mark all notifications as read');
      return false;
    }

    toast.success('All notifications marked as read');
    return true;
  } catch (error) {
    log.error('Error in markAllNotificationsAsRead', error);
    toast.error('Failed to mark all notifications as read');
    return false;
  }
};
