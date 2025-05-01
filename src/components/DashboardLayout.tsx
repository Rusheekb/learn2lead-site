import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import SidebarLinks from './SidebarLinks';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  role?: 'student' | 'tutor' | 'admin';
}

const DashboardLayout = ({ children, title, role = 'student' }) => {
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } transition-all duration-300 ease-in-out bg-white dark:bg-gray-800 shadow-md`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 flex items-center justify-between border-b dark:border-gray-700">
            <Link
              to="/"
              className={`${
                !isSidebarOpen && 'justify-center'
              } flex items-center text-xl font-bold text-tutoring-blue dark:text-tutoring-teal`}
            >
              {isSidebarOpen ? (
                <>
                  Learn<span className="text-tutoring-teal">2</span>Lead
                </>
              ) : (
                'L2L'
              )}
            </Link>
            <button
              onClick={toggleSidebar}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {isSidebarOpen ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
          </div>
          <div className="p-4 flex-grow">
            <SidebarLinks role={role} expanded={isSidebarOpen} />
          </div>
          <div className="p-4 border-t dark:border-gray-700">
            <button
              onClick={handleSignOut}
              className={`${
                isSidebarOpen
                  ? 'flex items-center w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  : 'flex justify-center w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <LogOut className="h-5 w-5" />
              {isSidebarOpen && <span className="ml-2">Logout</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-grow overflow-auto">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="p-4 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              {title}
            </h1>
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {user?.email}
              </p>
              <div className="w-10 h-10 rounded-full bg-tutoring-blue dark:bg-tutoring-teal text-white flex items-center justify-center">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>
        <main className="p-6 bg-gray-100 dark:bg-gray-900 min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>
    </div>
  );
};

interface SidebarLinksProps {
  role: 'student' | 'tutor' | 'admin';
  expanded: boolean;
}

const SidebarLinks: React.FC<SidebarLinksProps> = ({ role, expanded }) => {
  const baseClasses =
    'flex items-center px-4 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200';
  const expandedClasses = expanded ? 'justify-start' : 'justify-center';

  return (
    <nav className="space-y-1">
      {role === 'student' && (
        <>
          <Link to="/dashboard" className={`${baseClasses} ${expandedClasses}`}>
            <LayoutDashboard className="h-5 w-5" />
            {expanded && <span className="ml-3">Dashboard</span>}
          </Link>
          <Link to="/profile" className={`${baseClasses} ${expandedClasses}`}>
            <User className="h-5 w-5" />
            {expanded && <span className="ml-3">Profile</span>}
          </Link>
        </>
      )}

      {role === 'tutor' && (
        <>
          <Link
            to="/tutor-dashboard"
            className={`${baseClasses} ${expandedClasses}`}
          >
            <LayoutDashboard className="h-5 w-5" />
            {expanded && <span className="ml-3">Dashboard</span>}
          </Link>
          <Link
            to="/tutor-profile"
            className={`${baseClasses} ${expandedClasses}`}
          >
            <User className="h-5 w-5" />
            {expanded && <span className="ml-3">Profile</span>}
          </Link>
        </>
      )}

      {role === 'admin' && (
        <Link
          to="/admin-dashboard"
          className={`${baseClasses} ${expandedClasses}`}
        >
          <LayoutDashboard className="h-5 w-5" />
          {expanded && <span className="ml-3">Dashboard</span>}
        </Link>
      )}
    </nav>
  );
};

export default DashboardLayout;
