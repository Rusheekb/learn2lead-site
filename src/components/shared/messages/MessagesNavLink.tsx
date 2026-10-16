import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useUnreadMessageCount } from '@/hooks/queries/useMessagesQueries';
import UnreadBadge from './UnreadBadge';

interface MessagesNavLinkProps {
  to: string;
  className: string;
  isExpanded: boolean;
}

/** The "Messages" sidebar link, with the unread count. Same for every role. */
const MessagesNavLink: React.FC<MessagesNavLinkProps> = ({
  to,
  className,
  isExpanded,
}) => {
  const { data: unread = 0 } = useUnreadMessageCount();
  return (
    <NavLink
      to={to}
      className={`${className} relative`}
      aria-label={unread ? `Messages, ${unread} unread` : 'Messages'}
    >
      <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
      {isExpanded && <span className="ml-2.5">Messages</span>}
      <UnreadBadge compact={!isExpanded} />
    </NavLink>
  );
};

export default MessagesNavLink;
