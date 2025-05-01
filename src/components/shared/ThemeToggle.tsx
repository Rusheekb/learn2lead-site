
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, showLabel = true }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <Sun className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      <Switch 
        id="theme-toggle" 
        checked={theme === 'dark'}
        onCheckedChange={toggleTheme}
        className="data-[state=checked]:bg-tutoring-teal"
      />
      <Moon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      {showLabel && (
        <Label htmlFor="theme-toggle" className="cursor-pointer">
          {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
        </Label>
      )}
    </div>
  );
};

export default ThemeToggle;
