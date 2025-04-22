import React from 'react';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Calendar, Book, User } from 'lucide-react';

interface StudentMenubarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const StudentMenubar: React.FC<StudentMenubarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const menuItems = [
    {
      label: 'Dashboard',
      value: 'dashboard',
      icon: <LayoutDashboard className="w-4 h-4 mr-2" />,
    },
    {
      label: 'My Schedule',
      value: 'schedule',
      icon: <Calendar className="w-4 h-4 mr-2" />,
    },
    {
      label: 'Resources',
      value: 'resources',
      icon: <Book className="w-4 h-4 mr-2" />,
    },
    {
      label: 'Profile',
      value: 'profile',
      icon: <User className="w-4 h-4 mr-2" />,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {menuItems.map((item) => (
        <Button
          key={item.label}
          variant={activeTab === item.value ? 'default' : 'ghost'}
          className={`flex items-center ${
            activeTab === item.value ? 'bg-tutoring-blue text-white' : ''
          }`}
          onClick={() => setActiveTab(item.value)}
        >
          {item.icon} {item.label}
        </Button>
      ))}
    </div>
  );
};

export default StudentMenubar;
