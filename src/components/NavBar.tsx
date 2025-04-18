
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole, signOut } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = async () => {
    await signOut();
  };
  
  const handleDashboard = () => {
    if (!userRole) return;
    
    // Navigate based on user role
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

  const handleNavigation = (sectionId: string) => {
    // Close mobile menu if open
    setIsMenuOpen(false);

    // If we're not on the homepage, navigate to homepage first
    if (location.pathname !== '/') {
      navigate('/?section=' + sectionId);
      return;
    }

    // If we're already on the homepage, scroll to the section
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-2xl font-bold text-tutoring-blue">
              Learn<span className="text-tutoring-teal">2</span>Lead
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => handleNavigation('home')}
              className="text-gray-600 hover:text-tutoring-blue transition-colors"
            >
              Home
            </button>
            <button 
              onClick={() => handleNavigation('about')}
              className="text-gray-600 hover:text-tutoring-blue transition-colors"
            >
              About
            </button>
            <button 
              onClick={() => handleNavigation('services')}
              className="text-gray-600 hover:text-tutoring-blue transition-colors"
            >
              Services
            </button>
            <button 
              onClick={() => handleNavigation('testimonials')}
              className="text-gray-600 hover:text-tutoring-blue transition-colors"
            >
              Testimonials
            </button>
            <button 
              onClick={() => handleNavigation('contact')}
              className="text-gray-600 hover:text-tutoring-blue transition-colors"
            >
              Contact
            </button>
          </div>

          {/* CTA and Login/User Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
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
            ) : (
              <Button 
                variant="ghost"
                onClick={handleLogin}
                className="flex items-center space-x-2 text-tutoring-blue hover:bg-tutoring-blue/10"
              >
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Button>
            )}
            <Button 
              onClick={() => navigate('/book')}
              className="bg-tutoring-blue hover:bg-blue-700 text-white"
            >
              Book a Session
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-tutoring-blue focus:outline-none"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={cn(
        "md:hidden",
        isMenuOpen ? "block" : "hidden"
      )}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg">
          <button 
            onClick={() => handleNavigation('home')}
            className="block w-full text-left px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue"
          >
            Home
          </button>
          <button 
            onClick={() => handleNavigation('about')}
            className="block w-full text-left px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue"
          >
            About
          </button>
          <button 
            onClick={() => handleNavigation('services')}
            className="block w-full text-left px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue"
          >
            Services
          </button>
          <button 
            onClick={() => handleNavigation('testimonials')}
            className="block w-full text-left px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue"
          >
            Testimonials
          </button>
          <button 
            onClick={() => handleNavigation('contact')}
            className="block w-full text-left px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue"
          >
            Contact
          </button>
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
      </div>
    </nav>
  );
};

export default NavBar;
