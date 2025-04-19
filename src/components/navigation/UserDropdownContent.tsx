
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { 
  DropdownMenuContent, 
  DropdownMenuItem 
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

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={handleDashboard}>
        Dashboard
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" />
        <span>Logout</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
};

export default UserDropdownContent;
