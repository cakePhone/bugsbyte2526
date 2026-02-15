/**
 * Fund Page Loading State
 */

export default function FundLoading() {
  return (
    <div className="min-h-screen bg-[#121212] text-white font-mono p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="h-12 w-64 bg-gray-900 border-4 border-gray-700 animate-pulse" />
        
        {/* Fund Content Skeleton */}
        <div className="space-y-4">
          <div className="h-40 bg-gray-900 border-4 border-gray-700 animate-pulse" />
          <div className="h-32 bg-gray-900 border-4 border-gray-700 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
