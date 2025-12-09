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

export const CreditBadge: React.FC<CreditBadgeProps> = ({ credits, pricePerClass, className, hideAmount = false }) => {
  if (credits === null) return null;

  const getVariant = () => {
    if (credits < 0) return 'destructive';
    if (credits === 0) return 'destructive';
    if (credits < 3) return 'secondary';
    return 'default';
  };

  const getText = () => {
    if (credits < 0) {
      const absCredits = Math.abs(credits);
      const amountOwed = !hideAmount && pricePerClass ? absCredits * pricePerClass : null;
      const owedText = amountOwed ? ` ($${amountOwed.toFixed(0)} owed)` : '';
      return `${absCredits} ${absCredits === 1 ? 'class' : 'classes'} overdrawn${owedText}`;
    }
    return `${credits} ${credits === 1 ? 'class' : 'classes'} remaining`;
  };

  return (
    <Badge variant={getVariant()} className={cn('flex items-center gap-1.5', className)}>
      <CreditCard className="h-3.5 w-3.5" />
      <span>{getText()}</span>
    </Badge>
  );
};
