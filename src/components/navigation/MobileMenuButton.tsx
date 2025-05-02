
import { Menu, X } from 'lucide-react';

interface MobileMenuButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

const MobileMenuButton = ({ isOpen, onClick }: MobileMenuButtonProps) => {
  const label = isOpen ? 'Close menu' : 'Open menu';
  
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-tutoring-blue focus:outline-none focus:ring-2 focus:ring-inset focus:ring-tutoring-blue"
      aria-expanded={isOpen}
      aria-label={label}
    >
      {isOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
      <span className="sr-only">{label}</span>
    </button>
  );
};

export default MobileMenuButton;
