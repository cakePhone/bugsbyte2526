/**
 * Settings Page Loading State
 */

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-[#121212] text-white font-mono p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="h-12 w-80 bg-gray-900 border-4 border-gray-700 animate-pulse" />
        
        {/* Settings Sections Skeleton */}
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-900 border-4 border-gray-700 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
