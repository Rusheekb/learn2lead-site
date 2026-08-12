import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Calendar,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings,
  User,
  UserRound,
  Users,
  UsersRound,
  Mail,
  Gift,
  Webhook,
  ChevronDown,
  Wrench,
} from 'lucide-react';
import { useSidebarStyles } from './useSidebarStyles';

interface AdminNavLinksProps {
  isExpanded: boolean;
  profilePath: string;
}

const AdminNavLinks: React.FC<AdminNavLinksProps> = ({ isExpanded }) => {
  const { baseClasses, activeClasses, isLinkActive } = useSidebarStyles();
  const [toolsOpen, setToolsOpen] = useState(true);
  const pos = isExpanded ? 'justify-start' : 'justify-center';

  const cls = (tab: string) => {
    const active = isLinkActive('/admin-dashboard', { key: 'tab', value: tab });
    return `${baseClasses} ${pos}${active ? ` ${activeClasses}` : ''}`;
  };

  return (
    <nav className="space-y-0.5" aria-label="Admin navigation">
      <NavLink
        to="/admin-dashboard?tab=overview"
        className={cls('overview')}
        aria-label="Overview"
      >
        <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Overview</span>}
      </NavLink>
      <NavLink
        to="/admin-dashboard?tab=schedule"
        className={cls('schedule')}
        aria-label="Class Logs"
      >
        <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Class Logs</span>}
      </NavLink>
      <NavLink
        to="/admin-dashboard?tab=calendar"
        className={cls('calendar')}
        aria-label="Calendar"
      >
        <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Calendar</span>}
      </NavLink>
      <NavLink
        to="/admin-dashboard?tab=reports"
        className={cls('reports')}
        aria-label="Reports"
      >
        <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Reports</span>}
      </NavLink>
      <NavLink
        to="/admin-dashboard?tab=referrals"
        className={cls('referrals')}
        aria-label="Referrals"
      >
        <Gift className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Referrals</span>}
      </NavLink>

      {/* ── Tools section ──────────────────────────────────────────────── */}
      {isExpanded ? (
        <>
          <button
            onClick={() => setToolsOpen((o) => !o)}
            className={`${baseClasses} ${pos} w-full text-muted-foreground hover:text-foreground`}
            aria-expanded={toolsOpen}
          >
            <Wrench className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="ml-2.5 flex-1 text-left text-xs font-semibold uppercase tracking-wider">
              Tools
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${toolsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {toolsOpen && (
            <div className="pl-3">
              <NavLink
                to="/admin-dashboard?tab=credits"
                className={cls('credits')}
                aria-label="Credits"
              >
                <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="ml-2.5">Credits</span>
              </NavLink>
              <NavLink
                to="/admin-dashboard?tab=payments"
                className={cls('payments')}
                aria-label="Payments"
              >
                <Webhook className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="ml-2.5">Payments</span>
              </NavLink>
            </div>
          )}
        </>
      ) : (
        <>
          <NavLink
            to="/admin-dashboard?tab=credits"
            className={cls('credits')}
            aria-label="Credits"
          >
            <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
          </NavLink>
          <NavLink
            to="/admin-dashboard?tab=payments"
            className={cls('payments')}
            aria-label="Payments"
          >
            <Webhook className="h-4 w-4 shrink-0" aria-hidden="true" />
          </NavLink>
        </>
      )}

      <div className="my-2 mx-1 border-t border-border/60" />

      <NavLink
        to="/admin-dashboard?tab=tutors"
        className={cls('tutors')}
        aria-label="Tutors"
      >
        <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Tutors</span>}
      </NavLink>
      <NavLink
        to="/admin-dashboard?tab=students"
        className={cls('students')}
        aria-label="Students"
      >
        <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Students</span>}
      </NavLink>
      <NavLink
        to="/admin-dashboard?tab=assignments"
        className={cls('assignments')}
        aria-label="Assignments"
      >
        <UsersRound className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Assignments</span>}
      </NavLink>

      <div className="my-2 mx-1 border-t border-border/60" />

      <NavLink
        to="/admin-dashboard?tab=settings"
        className={cls('settings')}
        aria-label="Settings"
      >
        <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Settings</span>}
      </NavLink>
      <NavLink
        to="/admin-dashboard?tab=profile"
        className={cls('profile')}
        aria-label="Profile"
      >
        <User className="h-4 w-4 shrink-0" aria-hidden="true" />
        {isExpanded && <span className="ml-2.5">Profile</span>}
      </NavLink>
    </nav>
  );
};

export default AdminNavLinks;
