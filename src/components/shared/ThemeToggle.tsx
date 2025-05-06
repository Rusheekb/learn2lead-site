
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
  const themeLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {theme === 'dark' ? (
        <Moon className="h-5 w-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
      ) : (
        <Sun className="h-5 w-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
      )}
      <Switch 
        id="theme-toggle" 
        checked={theme === 'dark'}
        onCheckedChange={toggleTheme}
        className="data-[state=checked]:bg-tutoring-teal focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tutoring-blue dark:focus-visible:ring-tutoring-teal"
        aria-label={themeLabel}
      />
      {showLabel && (
        <Label htmlFor="theme-toggle" className="cursor-pointer text-gray-700 dark:text-gray-300 whitespace-nowrap">
          {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
        </Label>
      )}
      <span className="sr-only">{themeLabel}</span>
    </div>
  );
};

export default ThemeToggle;
