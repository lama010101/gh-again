import React from 'react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  errorMessage: string;
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ errorMessage, onRetry }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-history-dark to-black">
      <div className="text-amber-400 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Error Loading Results</h1>
      <p className="text-gray-300 mb-6">{errorMessage || 'Failed to load results'}</p>
      <Button onClick={onRetry} className="bg-gray-600 hover:bg-gray-700">
        Return to Home
      </Button>
    </div>
  );
};

export default ErrorState;
