import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn('border-b', className)}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(
          'flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline group',
          className
        )}
        onClick={() => setIsOpen(!isOpen)}
        {...props}
      >
        {children}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
        >
          <ChevronDown className="h-4 w-4 shrink-0" />
        </motion.div>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
});
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

// Content animation variants
const contentVariants = {
  collapsed: { 
    height: 0, 
    opacity: 0,
  },
  expanded: { 
    height: 'auto', 
    opacity: 1,
  },
};

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    asChild
    {...props}
  >
    <motion.div
      initial="collapsed"
      animate="expanded"
      exit="collapsed"
      variants={contentVariants}
      transition={{
        height: { duration: 0.3, ease: 'easeInOut' },
        opacity: { duration: 0.25 },
      }}
      className="overflow-hidden text-sm"
    >
      <motion.div 
        className={cn('pb-4 pt-0', className)}
        initial={{ y: -10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        {children}
      </motion.div>
    </motion.div>
  </AccordionPrimitive.Content>
));

AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
