import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanBadgeProps {
  planName: string | null;
  className?: string;
}

export const PlanBadge: React.FC<PlanBadgeProps> = ({ planName, className }) => {
  if (!planName) return null;

  const getPlanIcon = () => {
    const lowerPlan = planName.toLowerCase();
    if (lowerPlan.includes('premium')) return Crown;
    if (lowerPlan.includes('standard')) return Zap;
    return Circle;
  };

  const getPlanColor = () => {
    const lowerPlan = planName.toLowerCase();
    if (lowerPlan.includes('premium')) return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
    if (lowerPlan.includes('standard')) return 'bg-primary text-primary-foreground';
    return 'bg-secondary text-secondary-foreground';
  };

  const Icon = getPlanIcon();

  return (
    <Badge className={cn(getPlanColor(), 'flex items-center gap-1.5', className)}>
      <Icon className="h-3.5 w-3.5" />
      <span>{planName}</span>
    </Badge>
  );
};
