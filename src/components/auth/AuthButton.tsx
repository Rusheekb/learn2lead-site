
import React from 'react';
import { Button } from '@/components/ui/button';

interface AuthButtonProps {
  isLoading: boolean;
  text: string;
  loadingText: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const AuthButton: React.FC<AuthButtonProps> = ({
  isLoading,
  text,
  loadingText,
  onClick,
  type = 'submit'
}) => {
  return (
    <Button
      type={type}
      className="w-full"
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? loadingText : text}
    </Button>
  );
};

export default AuthButton;
