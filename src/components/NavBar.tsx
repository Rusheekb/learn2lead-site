
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <a href="#" className="text-2xl font-bold text-tutoring-blue">
              Learn<span className="text-tutoring-teal">2</span>Lead
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#home" className="text-gray-600 hover:text-tutoring-blue transition-colors">
              Home
            </a>
            <a href="#about" className="text-gray-600 hover:text-tutoring-blue transition-colors">
              About
            </a>
            <a href="#services" className="text-gray-600 hover:text-tutoring-blue transition-colors">
              Services
            </a>
            <a href="#testimonials" className="text-gray-600 hover:text-tutoring-blue transition-colors">
              Testimonials
            </a>
            <a href="#contact" className="text-gray-600 hover:text-tutoring-blue transition-colors">
              Contact
            </a>
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex">
            <Button className="bg-tutoring-blue hover:bg-blue-700 text-white">
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
          <a href="#home" className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue">
            Home
          </a>
          <a href="#about" className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue">
            About
          </a>
          <a href="#services" className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue">
            Services
          </a>
          <a href="#testimonials" className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue">
            Testimonials
          </a>
          <a href="#contact" className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-tutoring-blue">
            Contact
          </a>
          <Button className="w-full mt-4 bg-tutoring-blue hover:bg-blue-700 text-white">
            Book a Session
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
