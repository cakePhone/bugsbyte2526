'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="border-4 border-red-500 p-8 max-w-lg w-full">
        <h2 className="text-red-500 font-mono text-xl mb-4">
          SYSTEM MALFUNCTION
        </h2>
        <p className="text-gray-300 font-mono text-sm mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="bg-red-500 text-black font-mono px-4 py-2 hover:bg-red-400 transition-colors"
        >
          RETRY
        </button>
      </div>
    </div>
  );
}
