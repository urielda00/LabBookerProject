import React from 'react';

const LoadingSpinner = () => {
  return (
    // Center container
    <div className="flex justify-center items-center w-full h-full min-h-[200px]">
      <div
        className="
          animate-spin 
          rounded-full 
          h-12 w-12 
          border-4 
          border-gray-200 
          dark:border-gray-700 
          border-t-blue-500 
          dark:border-t-blue-400
        "
        role="status"
        aria-label="Loading"
      >
        {/* Screen reader only text for accessibility */}
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;