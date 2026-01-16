import React from 'react';
import LoadingSpinner from '../LoadingSpinner';

const LoadingState: React.FC = () => {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <LoadingSpinner size="lg" className="h-auto" />
    </div>
  );
};

export default LoadingState;
