import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import StudentMenubar from './StudentMenubar';

interface DashboardNavProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

const DashboardNav: React.FC<DashboardNavProps> = ({
  activeTab = 'dashboard',
  setActiveTab = () => {},
}) => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-tutoring-blue">
              Learn<span className="text-tutoring-teal">2</span>Lead
            </Link>
            <span className="ml-2 text-gray-500">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <Button
              variant="ghost"
              className="ml-2"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/';
              }}
            >
              Logout
            </Button>
          </div>
        </div>

        <div className="py-2 flex items-center justify-between">
          <StudentMenubar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>
    </header>
  );
};

export default DashboardNav;
