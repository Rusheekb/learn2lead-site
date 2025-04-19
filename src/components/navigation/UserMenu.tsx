
import React from 'react';
import { LogIn } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';
import UserAccountButton from './UserAccountButton';
import UserDropdownContent from './UserDropdownContent';

interface UserMenuProps {
  user: any;
  userRole: string | null;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, userRole }) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };
  
  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <UserAccountButton 
            email={user.email} 
            onClick={() => {}} // Trigger dropdown 
          />
        </DropdownMenuTrigger>
        <UserDropdownContent userRole={userRole} />
      </DropdownMenu>
    );
  }
  
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
};

export default UserMenu;
