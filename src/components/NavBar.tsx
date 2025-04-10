import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from 'react-router-dom';

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogin = () => {
    navigate('/login');
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
            <Link to="/" className="text-gray-600 hover:text-tutoring-blue transition-colors">
              Home
            </Link>
            <Link to="/about" className="text-gray-600 hover:text-tutoring-blue transition-colors">
              About
            </Link>
            <Link to="/services" className="text-gray-600 hover:text-tutoring-blue transition-colors">
              Services
            </Link>
            <Link to="/testimonials" className="text-gray-600 hover:text-tutoring-blue transition-colors">
              Testimonials
            </Link>
            <Link to="/contact" className="text-gray-600 hover:text-tutoring-blue transition-colors">
              Contact
            </Link>
          </div>

          {/* CTA and Login Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button 
              variant="ghost"
              onClick={handleLogin}
              className="flex items-center space-x-2 text-tutoring-blue hover:bg-tutoring-blue/10"
            >
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </Button>
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
          <Link to="/" className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue">
            Home
          </Link>
          <Link to="/about" className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue">
            About
          </Link>
          <Link to="/services" className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue">
            Services
          </Link>
          <Link to="/testimonials" className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue">
            Testimonials
          </Link>
          <Link to="/contact" className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue">
            Contact
          </Link>
          <Button 
            onClick={handleLogin}
            variant="ghost"
            className="w-full mt-2 flex items-center justify-center space-x-2 text-tutoring-blue hover:bg-tutoring-blue/10"
          >
            <LogIn className="h-4 w-4" />
            <span>Login</span>
          </Button>
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
