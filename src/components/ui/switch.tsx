import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, checked, ...props }, ref) => {
  const isChecked = checked ?? props.defaultChecked ?? false;
  
  return (
    <SwitchPrimitives.Root
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      checked={checked}
      {...props}
      ref={ref}
      asChild
    >
      <motion.button
        initial={false}
        animate={{
          backgroundColor: isChecked 
            ? 'hsl(var(--primary))' 
            : 'hsl(var(--input))',
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
      >
        <SwitchPrimitives.Thumb asChild>
          <motion.span
            className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0"
            initial={false}
            animate={{
              x: isChecked ? 20 : 0,
              scale: isChecked ? 1 : 0.9,
            }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
            }}
            whileHover={{ scale: isChecked ? 1.05 : 0.95 }}
          />
        </SwitchPrimitives.Thumb>
      </motion.button>
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
