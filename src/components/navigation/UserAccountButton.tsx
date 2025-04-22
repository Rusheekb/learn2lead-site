import React from 'react';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserAccountButtonProps {
  email: string | undefined;
  onClick?: () => void;
}

const UserAccountButton = React.forwardRef<
  HTMLButtonElement,
  UserAccountButtonProps
>(({ email, onClick }, ref) => {
  const displayName = email?.split('@')[0] || 'Account';

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      ref={ref}
      className="flex items-center space-x-2 text-tutoring-blue hover:bg-tutoring-blue/10"
      type="button"
    >
      <User className="h-4 w-4" />
      <span>{displayName}</span>
    </Button>
  );
});

UserAccountButton.displayName = 'UserAccountButton';

export default UserAccountButton;
