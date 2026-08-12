import React from 'react';
import { NavLink } from 'react-router-dom';
import { User, Calendar, Users } from 'lucide-react';
import { useSidebarStyles } from './useSidebarStyles';

interface TutorNavLinksProps {
  isExpanded: boolean;
  profilePath: string;
}

const TutorNavLinks: React.FC<TutorNavLinksProps> = ({ isExpanded }) => {
  const { baseClasses, activeClasses, isLinkActive } = useSidebarStyles();
  const pos = isExpanded ? 'justify-start' : 'justify-center';

  const cls = (tab: string) => {
    const active = isLinkActive('/tutor-dashboard', { key: 'tab', value: tab });
    return `${baseClasses} ${pos}${active ? ` ${activeClasses}` : ''}`;
  };

  return (
    <nav className="space-y-0.5" aria-label="Tutor navigation">
      <NavLink
        to="/tutor-dashboard?tab=schedule"
        className={cls('schedule')}
        aria-label="My Schedule"
      >
        <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">My Schedule</span>}
      </NavLink>
      <NavLink
        to="/tutor-dashboard?tab=students"
        className={cls('students')}
        aria-label="My Students"
      >
        <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">My Students</span>}
      </NavLink>
      <NavLink
        to="/tutor-dashboard?tab=profile"
        className={cls('profile')}
        aria-label="Profile"
      >
        <User className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Profile</span>}
      </NavLink>
    </nav>
  );
};

export default TutorNavLinks;
