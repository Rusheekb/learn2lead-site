
import React from 'react';
import { User } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface UserAccountButtonProps {
  email: string;
  onClick: () => void;
}

const UserAccountButton: React.FC<UserAccountButtonProps> = ({ email, onClick }) => {
  const displayName = email?.split('@')[0] || 'Account';

  return (
    <Button 
      variant="ghost" 
      onClick={onClick} 
      className="flex items-center space-x-2 text-tutoring-blue hover:bg-tutoring-blue/10"
    >
      <User className="h-4 w-4" />
      <span>{displayName}</span>
    </Button>
  );
};

export default UserAccountButton;
