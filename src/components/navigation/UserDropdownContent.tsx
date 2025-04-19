
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { AppRole } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';

interface UserDropdownContentProps {
  userRole: AppRole | null;
}

const UserDropdownContent: React.FC<UserDropdownContentProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleDashboard = () => {
    if (!userRole) return;
    
    switch (userRole) {
      case 'student':
        navigate('/dashboard', { replace: true });
        break;
      case 'tutor':
        navigate('/tutor-dashboard', { replace: true });
        break;
      case 'admin':
        navigate('/admin-dashboard', { replace: true });
        break;
      default:
        navigate('/dashboard', { replace: true });
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <DropdownMenuContent align="end" className="w-56 bg-white z-50">
      <DropdownMenuItem onClick={handleDashboard} className="cursor-pointer hover:bg-gray-100">
        <LayoutDashboard className="h-4 w-4 mr-2" />
        <span>Dashboard</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 hover:bg-red-50 hover:text-red-600">
        <LogOut className="h-4 w-4 mr-2" />
        <span>Logout</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
};

export default UserDropdownContent;
