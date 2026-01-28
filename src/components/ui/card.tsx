import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  interactive?: boolean;
  hoverEffect?: 'lift' | 'glow' | 'scale' | 'none';
}

// Enhanced shadow values using CSS custom properties for theming
const hoverEffects = {
  lift: {
    y: -8,
    scale: 1.02,
    boxShadow: '0 20px 40px -12px hsl(var(--foreground) / 0.15), 0 12px 20px -8px hsl(var(--foreground) / 0.1)',
  },
  glow: {
    scale: 1.01,
    boxShadow: '0 0 30px -5px hsl(var(--primary) / 0.3), 0 10px 20px -10px hsl(var(--foreground) / 0.1)',
  },
  scale: {
    scale: 1.03,
    boxShadow: '0 15px 30px -10px hsl(var(--foreground) / 0.12)',
  },
  none: {},
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, hoverEffect = 'lift', ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm transition-colors',
        interactive && 'cursor-pointer',
        className
      )}
      initial={{ 
        boxShadow: '0 1px 3px 0 hsl(var(--foreground) / 0.05), 0 1px 2px -1px hsl(var(--foreground) / 0.05)' 
      }}
      whileHover={
        interactive
          ? {
              ...hoverEffects[hoverEffect],
              transition: {
                type: 'spring',
                stiffness: 300,
                damping: 20,
              },
            }
          : undefined
      }
      whileTap={
        interactive
          ? {
              scale: 0.98,
              y: 0,
              transition: {
                type: 'spring',
                stiffness: 500,
                damping: 30,
              },
            }
          : undefined
      }
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
