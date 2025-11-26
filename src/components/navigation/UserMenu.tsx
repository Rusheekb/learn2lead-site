import React from 'react';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import UserAccountButton from './UserAccountButton';
import UserDropdownContent from './UserDropdownContent';
import { AppRole } from '@/hooks/useProfile';
import { getDashboardPath } from '@/utils/authNavigation';

interface UserMenuProps {
  user: any;
  userRole: AppRole | null;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, userRole }) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  const handleDashboardClick = () => {
    const dashboardPath = getDashboardPath(userRole);
    navigate(dashboardPath);
  };

  if (!user) {
    return (
      <Button
        variant="ghost"
        onClick={handleLogin}
        className="flex items-center space-x-2 text-tutoring-blue hover:bg-tutoring-blue/10"
      >
        <LogIn className="h-4 w-4" />
        <span>Login</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <UserAccountButton email={user.email} onClick={handleDashboardClick} />
      </DropdownMenuTrigger>
      <UserDropdownContent userRole={userRole} />
    </DropdownMenu>
  );
};

export default UserMenu;
