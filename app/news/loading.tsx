/**
 * News Page Loading State
 */

export default function NewsLoading() {
  return (
    <div className="min-h-screen bg-[#121212] text-white font-mono p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="h-12 w-64 bg-gray-900 border-4 border-gray-700 animate-pulse" />
        
        {/* News Cards Skeleton */}
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-900 border-4 border-gray-700 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
