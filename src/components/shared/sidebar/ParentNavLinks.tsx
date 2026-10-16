import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings } from 'lucide-react';
import { useSidebarStyles } from './useSidebarStyles';
import MessagesNavLink from '../messages/MessagesNavLink';

interface ParentNavLinksProps {
  isExpanded: boolean;
}

const ParentNavLinks: React.FC<ParentNavLinksProps> = ({ isExpanded }) => {
  const { baseClasses, activeClasses, isLinkActive } = useSidebarStyles();
  const pos = isExpanded ? 'justify-start' : 'justify-center';

  const cls = (tab: string | null) => {
    const active = isLinkActive('/family', { key: 'tab', value: tab });
    return `${baseClasses} ${pos}${active ? ` ${activeClasses}` : ''}`;
  };

  return (
    <nav className="space-y-0.5" aria-label="Family navigation">
      <NavLink to="/family" className={cls(null)} aria-label="Family">
        <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Family</span>}
      </NavLink>
      <MessagesNavLink
        to="/family?tab=messages"
        className={cls('messages')}
        isExpanded={isExpanded}
      />
      <NavLink
        to="/family?tab=profile"
        className={cls('profile')}
        aria-label="Settings"
      >
        <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Settings</span>}
      </NavLink>
    </nav>
  );
};

export default ParentNavLinks;
