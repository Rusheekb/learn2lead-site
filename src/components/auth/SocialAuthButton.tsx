
import React from 'react';
import { Button } from '@/components/ui/button';

interface SocialAuthButtonProps {
  provider: string;
  isLoading: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

const SocialAuthButton: React.FC<SocialAuthButtonProps> = ({
  provider,
  isLoading,
  onClick,
  icon
}) => {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full flex items-center gap-2"
      onClick={onClick}
      disabled={isLoading}
    >
      {icon}
      Continue with {provider}
    </Button>
  );
};

export default SocialAuthButton;
