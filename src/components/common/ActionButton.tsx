import React from 'react';
import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button';

interface ActionButtonProps extends ButtonProps {
  /** Visual feedback color on click - defaults to current color */
  feedbackColor?: 'default' | 'destructive' | 'success';
}

/**
 * Action button with micro-interactions for table actions
 * Includes hover scale and click feedback animations
 */
const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ children, className = '', feedbackColor = 'default', ...props }, ref) => {
    return (
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
  }
);

ActionButton.displayName = 'ActionButton';

export { ActionButton };
export type { ActionButtonProps };
