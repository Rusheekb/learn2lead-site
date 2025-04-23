
import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  role: 'student' | 'tutor' | 'admin';
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  role,
}) => {
  const { signOut } = useAuth();

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link
                to={
                  role === 'student'
                    ? '/dashboard'
                    : role === 'tutor'
                      ? '/tutor-dashboard'
                      : '/admin-dashboard'
                }
                className="text-2xl font-bold text-tutoring-blue"
              >
                Learn<span className="text-tutoring-teal">2</span>Lead
              </Link>
              <span className="ml-2 text-gray-500">{title}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <Button
                variant="ghost"
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
