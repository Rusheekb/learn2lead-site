import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, User, Calendar, Book } from 'lucide-react';
import { useSidebarStyles } from './useSidebarStyles';

interface StudentNavLinksProps {
  isExpanded: boolean;
  profilePath: string;
}

const StudentNavLinks: React.FC<StudentNavLinksProps> = ({ isExpanded }) => {
  const { baseClasses, activeClasses, isLinkActive } = useSidebarStyles();
  const pos = isExpanded ? 'justify-start' : 'justify-center';

  const cls = (tab: string | null) => {
    const active = isLinkActive('/dashboard', { key: 'tab', value: tab });
    return `${baseClasses} ${pos}${active ? ` ${activeClasses}` : ''}`;
  };

  return (
    <nav className="space-y-0.5" aria-label="Student navigation">
      <NavLink to="/dashboard" className={cls(null)} aria-label="Dashboard">
        <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Dashboard</span>}
      </NavLink>
      <NavLink
        to="/dashboard?tab=schedule"
        className={cls('schedule')}
        aria-label="My Schedule"
      >
        <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">My Schedule</span>}
      </NavLink>
      <NavLink
        to="/dashboard?tab=resources"
        className={cls('resources')}
        aria-label="Resources"
      >
        <Book className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Resources</span>}
      </NavLink>
      <NavLink
        to="/dashboard?tab=profile"
        className={cls('profile')}
        aria-label="Profile"
      >
        <User className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Profile</span>}
      </NavLink>
    </nav>
  );
};

export default StudentNavLinks;
