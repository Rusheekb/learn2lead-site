
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import NavMenu from '@/components/navigation/NavMenu';
import UserMenu from '@/components/navigation/UserMenu';
import MobileMenu from '@/components/navigation/MobileMenu';
import Logo from '@/components/navigation/Logo';
import MobileMenuButton from '@/components/navigation/MobileMenuButton';
import DesktopBookButton from '@/components/navigation/DesktopBookButton';

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user, userRole } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavigation = (sectionId: string) => {
    setIsMenuOpen(false);

    if (location.pathname !== '/') {
      navigate('/?section=' + sectionId);
      return;
    }

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
            <Logo />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <NavMenu onNavItemClick={handleNavigation} />
          </div>

          {/* CTA and Login/User Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <UserMenu user={user} userRole={userRole} />
            <DesktopBookButton />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <MobileMenuButton isOpen={isMenuOpen} onClick={toggleMenu} />
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <MobileMenu 
          user={user} 
          userRole={userRole} 
          onNavItemClick={handleNavigation} 
        />
      )}
    </nav>
  );
};

export default NavBar;
