import React from 'react';

interface NavMenuProps {
  onNavItemClick: (sectionId: string) => void;
}

const NavMenu: React.FC<NavMenuProps> = ({ onNavItemClick }) => {
  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'testimonials', label: 'Testimonials' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <>
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavItemClick(item.id)}
          className="text-gray-600 hover:text-tutoring-blue transition-colors"
        >
          {item.label}
        </button>
      ))}
    </>
  );
};

export default NavMenu;
