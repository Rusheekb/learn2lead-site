
import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationsList from './NotificationsList';
import { Badge } from '@/components/ui/badge';
import { motion, useAnimation } from 'framer-motion';

interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
  const [open, setOpen] = useState(false);
  const { notifications, isLoading, markAsRead, markAllAsRead, getUnreadCount } = useNotifications();
  const controls = useAnimation();
  const prevUnreadCount = useRef<number>(0);

  const unreadCount = getUnreadCount();

  // Trigger bounce animation when unread count increases
  useEffect(() => {
    if (unreadCount > prevUnreadCount.current) {
      controls.start({
        rotate: [0, -15, 15, -10, 10, -5, 5, 0],
        scale: [1, 1.2, 1.1, 1.15, 1.05, 1.1, 1],
        transition: {
          duration: 0.6,
          ease: "easeInOut",
        }
      });
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount, controls]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`relative p-2 ${className}`}
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <motion.div animate={controls}>
            <Bell className="h-5 w-5" />
          </motion.div>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="absolute -top-1 -right-1"
            >
              <Badge 
                className="h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground text-xs"
                aria-label={`${unreadCount} unread notifications`}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            </motion.div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 max-h-[400px] overflow-hidden flex flex-col"
        align="end"
        sideOffset={5}
      >
        <NotificationsList
          notifications={notifications}
          isLoading={isLoading}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
