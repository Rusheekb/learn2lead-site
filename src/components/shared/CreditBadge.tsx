import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatHours } from '@/lib/hours';

interface CreditBadgeProps {
  credits: number | null;
  pricePerHour?: number | null;
  className?: string;
  hideAmount?: boolean;
}

export const CreditBadge: React.FC<CreditBadgeProps> = ({
  credits,
  pricePerHour,
  className,
  hideAmount,
}) => {
  if (credits === null) return null;

  const isOverdrawn = credits < 0;

  const getVariant = () => {
    if (isOverdrawn || credits === 0) return 'destructive';
    if (credits < 3) return 'secondary';
    return 'default';
  };

  const amountOwed =
    isOverdrawn && !hideAmount && pricePerHour != null
      ? ` ($${(Math.abs(credits) * pricePerHour).toFixed(0)} owed)`
      : '';

  return (
    <Badge
      variant={getVariant()}
      className={cn('flex items-center gap-1.5', className)}
    >
      <CreditCard className="h-3.5 w-3.5" />
      <span>
        {formatHours(Math.abs(credits))}{' '}
        {isOverdrawn ? 'overdrawn' : 'remaining'}
        {amountOwed}
      </span>
    </Badge>
  );
};
