
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import NavMenu from '@/components/navigation/NavMenu';
import UserMenu from '@/components/navigation/UserMenu';
import MobileMenu from '@/components/navigation/MobileMenu';
import Logo from '@/components/navigation/Logo';
import MobileMenuButton from '@/components/navigation/MobileMenuButton';
import DesktopBookButton from '@/components/navigation/DesktopBookButton';

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole } = useAuth();

  // Track scroll position for styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Add shadow and background opacity when scrolled
  const navClasses = `fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${
    isScrolled ? 'bg-white/95 shadow-md' : 'bg-white/90'
  } backdrop-blur-sm border-b border-gray-100`;

  return (
    <nav className={navClasses}>
      <div className="container mx-auto px-4">
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
