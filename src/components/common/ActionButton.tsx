import React from 'react';
import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ActionButtonProps extends ButtonProps {
  /** Visual feedback color on click - defaults to current color */
  feedbackColor?: 'default' | 'destructive' | 'success';
  /** Optional tooltip text */
  tooltip?: string;
  /** Tooltip position */
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Action button with micro-interactions for table actions
 * Includes hover scale, click feedback animations, and optional animated tooltip
 */
const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ children, className = '', feedbackColor = 'default', tooltip, tooltipSide = 'top', ...props }, ref) => {
    const buttonContent = (
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      >
        <Button
          ref={ref}
          className={`transition-colors ${className}`}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    );

    if (tooltip) {
      return (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              {buttonContent}
            </TooltipTrigger>
            <TooltipContent side={tooltipSide}>
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return buttonContent;
  }
);

ActionButton.displayName = 'ActionButton';

export { ActionButton };
export type { ActionButtonProps };
