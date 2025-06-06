import React from 'react';

const SpinnerOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-white/50 dark:bg-slate-800/50 flex items-center justify-center z-50">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
    </div>
  );
};

export default SpinnerOverlay; 