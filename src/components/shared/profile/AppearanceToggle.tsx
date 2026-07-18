import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Moon } from 'lucide-react';

const AppearanceToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('theme') === 'dark' ||
        document.documentElement.classList.contains('dark')
      );
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <Moon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm font-medium">Dark mode</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Switch between light and dark theme
          </p>
        </div>
      </div>
      <Switch id="darkMode" checked={isDark} onCheckedChange={setIsDark} />
    </div>
  );
};

export default AppearanceToggle;
