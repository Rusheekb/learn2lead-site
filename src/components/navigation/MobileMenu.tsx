
import React from 'react';
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/hooks/useProfile';

interface MobileMenuProps {
  user: any;
  userRole: AppRole | null;
  onNavItemClick: (sectionId: string) => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ user, userRole, onNavItemClick }) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  
  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'testimonials', label: 'Testimonials' },
    { id: 'contact', label: 'Contact' }
  ];

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

  return (
    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg">
      {navItems.map(item => (
        <button 
          key={item.id}
          onClick={() => onNavItemClick(item.id)}
          className="block w-full text-left px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue"
        >
          {item.label}
        </button>
      ))}
      
      {user ? (
        <>
          <Button
            onClick={handleDashboard}
            variant="ghost"
            className="w-full justify-start px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue"
          >
            Dashboard
          </Button>
          <Button 
            onClick={handleLogout}
            variant="ghost"
            className="w-full mt-2 flex items-center justify-center space-x-2 text-tutoring-blue hover:bg-tutoring-blue/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </>
      ) : (
        <Button 
          onClick={handleLogin}
          variant="ghost"
          className="w-full mt-2 flex items-center justify-center space-x-2 text-tutoring-blue hover:bg-tutoring-blue/10"
        >
          <LogIn className="h-4 w-4" />
          <span>Login</span>
        </Button>
      )}
      
      <Button 
        onClick={() => navigate('/book')}
        className="w-full mt-2 bg-tutoring-blue hover:bg-blue-700 text-white"
      >
        Book a Session
      </Button>
    </div>
  );
};

export default MobileMenu;
