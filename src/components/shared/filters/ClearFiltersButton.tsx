import React from 'react';
import { Button } from '@/components/ui/button';

interface ClearFiltersButtonProps {
  onClick: () => void;
  className?: string;
}

const ClearFiltersButton: React.FC<ClearFiltersButtonProps> = ({
  onClick,
  className,
}) => {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className={className}>
      Clear Filters
    </Button>
  );
};

export default ClearFiltersButton;
