import React from 'react';
import { useUnreadMessageCount } from '@/hooks/queries/useMessagesQueries';

/** Unread messages count for the sidebar; a dot when the sidebar is collapsed. */
const UnreadBadge: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { data: count = 0 } = useUnreadMessageCount();
  if (!count) return null;
  if (compact) {
    return (
      <span
        className="absolute top-1 right-1 h-2 w-2 rounded-full bg-tutoring-blue"
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className="ml-auto min-w-[1.25rem] rounded-full bg-tutoring-blue px-1.5 text-center text-[10px] font-semibold leading-4 text-white"
      aria-hidden="true"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};

export default UnreadBadge;
