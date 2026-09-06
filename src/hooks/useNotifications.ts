import { useEffect, useState } from 'react';
import { Notification } from '@/types/notificationTypes';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const log = logger.create('useNotifications');

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
    const success = await markNotificationAsRead(id);
    if (success) {
      setNotifications((prev) =>
        prev.map((notification) =>
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
    const success = await markAllNotificationsAsRead();
    if (success) {
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );
    }
    return success;
  };

  // Get unread count
  const getUnreadCount = () => {
    return notifications.filter((n) => !n.read).length;
  };

  // Set up realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;

    // Initial load
    loadNotifications();

    // Set up realtime subscription. Channel name must be unique per mount —
    // DashboardShell keeps a desktop AppSidebar (CSS-hidden, not unmounted)
    // and a mobile-Sheet AppSidebar simultaneously, so this hook mounts
    // twice at once on every dashboard page. A shared literal name here
    // meant the second .subscribe() call collided with the first (Supabase
    // realtime returns the same channel object for a repeated name and
    // throws on adding a callback to an already-subscribed channel) — the
    // resulting uncaught error was breaking the mobile sidebar drawer
    // (it never opened at all, reproduced directly: opening the drawer
    // mounts the second instance and throws immediately).
    const channel = supabase
      .channel(`notifications-${user.id}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          log.info('Notification change received');
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
