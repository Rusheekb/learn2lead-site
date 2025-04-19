
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogIn, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/AuthContext';

interface UserMenuProps {
  user: any;
  userRole: string | null;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, userRole }) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = async () => {
    await signOut();
  };
  
  const handleDashboard = () => {
    if (!userRole) return;
    
    switch (userRole) {
      case 'student':
        navigate('/dashboard');
        break;
      case 'tutor':
        navigate('/tutor-dashboard');
        break;
      case 'admin':
        navigate('/admin-dashboard');
        break;
      default:
        navigate('/dashboard');
    }
  };

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center space-x-2 text-tutoring-blue hover:bg-tutoring-blue/10">
            <User className="h-4 w-4" />
            <span>{user.email?.split('@')[0] || 'Account'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDashboard}>
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
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
