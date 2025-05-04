
import { useEffect, useState } from 'react';
import { Notification } from '@/types/notificationTypes';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  
  // Load notifications
  const loadNotifications = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (id: string) => {
    const success = await markNotificationRead(id);
    if (success) {
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, read: true } 
            : notification
        )
      );
    }
    return success;
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const success = await markAllNotificationsRead();
    if (success) {
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    }
    return success;
  };

  // Get unread count
  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  // Set up realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;

    // Initial load
    loadNotifications();

    // Set up realtime subscription
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Notification change received:', payload);
          // Refresh notifications when there's a change
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    notifications,
    isLoading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
  };
};
