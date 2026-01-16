import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  return (
    <div className={`flex items-center justify-center h-64 ${className}`}>
      <div className="relative">
        {/* Outer pulse ring */}
        <motion.div
          className={`absolute inset-0 rounded-full bg-primary/20 ${sizeClasses[size]}`}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        {/* Main spinning element */}
        <motion.div
          className={`rounded-full border-2 border-primary/30 border-t-primary ${sizeClasses[size]}`}
          animate={{ rotate: 360 }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        
        {/* Inner dot */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
        </motion.div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
