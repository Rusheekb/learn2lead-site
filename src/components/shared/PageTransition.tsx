import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

// Animation variants for page transitions
const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

// Spring-based fade with subtle scale for polished tab transitions
const fadeVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.98,
  },
  enter: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.12,
      ease: 'easeIn',
    },
  },
};

// Scale variant for modal-like transitions
const scaleVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.96,
  },
  enter: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

// Stagger container variants with exit
const staggerContainerVariants: Variants = {
  initial: {},
  enter: {
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

// Stagger item variants with exit
const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    y: -5,
    transition: { duration: 0.15, ease: 'easeIn' }
  },
};

/**
 * Wrapper for page-level transitions
 * Animates pages when navigating between routes
 */
export const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Wrapper for content/tab transitions within a page
 * Uses a fade-only animation for smoother tab switching
 */
export const ContentTransition = ({ children, transitionKey }: { children: ReactNode; transitionKey: string }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={fadeVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Wrapper for card/modal-like transitions
 * Uses scale + fade for a pop-in effect
 */
export const ScaleTransition = ({ children, show }: { children: ReactNode; show: boolean }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial="initial"
          animate="enter"
          exit="exit"
          variants={scaleVariants}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Stagger children animation wrapper
 * Animates children in sequence with exit support
 */
export const StaggerContainer = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="enter"
      exit="exit"
      variants={staggerContainerVariants}
    >
      {children}
    </motion.div>
  );
};

/**
 * Individual stagger item
 * Use as child of StaggerContainer
 */
export const StaggerItem = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      className={className}
      variants={staggerItemVariants}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
