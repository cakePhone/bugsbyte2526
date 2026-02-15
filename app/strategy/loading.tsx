/**
 * Strategy Page Loading State
 */

export default function StrategyLoading() {
  return (
    <div className="min-h-screen bg-[#121212] text-white font-mono p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="h-12 w-72 bg-gray-900 border-4 border-gray-700 animate-pulse" />
        
        {/* Strategy Cards Skeleton */}
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-gray-900 border-4 border-gray-700 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
