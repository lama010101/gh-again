import React from 'react';
import { Loader } from 'lucide-react';

const LoadingState: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-history-light to-white dark:from-history-dark dark:to-gray-900">
      <Loader className="w-12 h-12 animate-spin text-history-accent mb-4" />
      <p className="text-xl font-medium">Loading results...</p>
    </div>
  );
};

export default LoadingState;
