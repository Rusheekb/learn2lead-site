import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreditBadgeProps {
  credits: number | null;
  pricePerClass?: number | null;
  className?: string;
  hideAmount?: boolean;
}

export const CreditBadge: React.FC<CreditBadgeProps> = ({ credits, className }) => {
  if (credits === null) return null;

  const getVariant = () => {
    if (credits === 0) return 'destructive';
    if (credits < 3) return 'secondary';
    return 'default';
  };

  return (
    <Badge variant={getVariant()} className={cn('flex items-center gap-1.5', className)}>
      <CreditCard className="h-3.5 w-3.5" />
      <span>{credits} {credits === 1 ? 'class' : 'classes'} remaining</span>
    </Badge>
  );
};
