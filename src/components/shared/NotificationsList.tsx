
import React from 'react';
import { Notification } from '@/types/notificationTypes';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface NotificationsListProps {
  notifications: Notification[];
  isLoading: boolean;
  onMarkAsRead: (id: string) => Promise<boolean>;
  onMarkAllAsRead: () => Promise<boolean>;
  onClose: () => void;
}

const NotificationsList: React.FC<NotificationsListProps> = ({
  notifications,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}) => {
  const handleMarkAllRead = async () => {
    await onMarkAllAsRead();
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await onMarkAsRead(notification.id);
    }

    // If it's a class reminder, we could potentially navigate to that class
    if (notification.type === 'class_reminder' && notification.related_id) {
      // For now, just close the notification panel
      onClose();
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-medium">Notifications</h3>
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleMarkAllRead} 
            className="text-xs"
          >
            <Check className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
          <Bell className="h-8 w-8 mb-2" />
          <p className="mb-1">No notifications yet</p>
          <p className="text-xs text-gray-400">
            You'll receive notifications about your upcoming classes
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-grow">
          <div className="max-h-80">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  'p-4 border-b last:border-0 cursor-pointer flex flex-col gap-1 hover:bg-gray-50 dark:hover:bg-gray-800',
                  !notification.read && 'bg-blue-50 dark:bg-blue-900/20'
                )}
              >
                <div className={cn(
                  'text-sm font-medium',
                  !notification.read ? 'text-gray-900 dark:text-gray-50' : 'text-gray-700 dark:text-gray-300'
                )}>
                  {notification.message}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </>
  );
};

export default NotificationsList;
