/**
 * Dashboard Loading State
 * Shows immediately while the dashboard JS bundle loads
 */

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#121212] text-white font-mono flex flex-col">
      {/* Skeleton Header */}
      <header className="border-b-4 border-white bg-black h-14 flex items-center">
        <div className="border-r-4 border-white h-full flex items-center px-4">
          <h1 className="text-lg font-black uppercase tracking-tighter text-white whitespace-nowrap">
            ☕ GEISHA GAINS
          </h1>
        </div>
        <div className="flex-1 h-full border-r-4 border-white flex items-center px-4">
          <div className="w-full max-w-2xl mx-auto h-10 bg-gray-900 border-4 border-gray-700 animate-pulse" />
        </div>
        <div className="border-r-4 border-white h-full flex items-center px-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-600 animate-pulse" />
            <span className="text-[10px] font-black font-mono text-gray-600 uppercase">
              LOADING...
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="flex-1 flex p-4 gap-4">
        {/* Left Sidebar Skeleton */}
        <div className="w-1/4 space-y-4">
          <div className="h-64 bg-gray-900 border-4 border-gray-700 animate-pulse" />
          <div className="h-32 bg-gray-900 border-4 border-gray-700 animate-pulse" />
          <div className="h-24 bg-gray-900 border-4 border-gray-700 animate-pulse" />
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 space-y-4">
          <div className="h-96 bg-gray-900 border-4 border-gray-700 animate-pulse" />
          <div className="h-32 bg-gray-900 border-4 border-gray-700 animate-pulse" />
          <div className="h-16 bg-gray-900 border-4 border-gray-700 animate-pulse" />
        </div>
      </main>

      {/* Footer Skeleton */}
      <footer className="border-t-4 border-white bg-black h-10 flex items-center px-4">
        <div className="w-48 h-4 bg-gray-800 animate-pulse" />
      </footer>
    </div>
  );
}
