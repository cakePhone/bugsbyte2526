"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ClockData {
  id: string;
  city: string;
  timezone: string;
  country: string;
}

const WORLD_TIMEZONES: ClockData[] = [
  { id: "local", city: "Local", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, country: "Local" },
  { id: "us-ny", city: "NYC", timezone: "America/New_York", country: "USA" },
  { id: "us-la", city: "LA", timezone: "America/Los_Angeles", country: "USA" },
  { id: "us-chi", city: "Chicago", timezone: "America/Chicago", country: "USA" },
  { id: "uk", city: "London", timezone: "Europe/London", country: "UK" },
  { id: "fr", city: "Paris", timezone: "Europe/Paris", country: "France" },
  { id: "de", city: "Berlin", timezone: "Europe/Berlin", country: "Germany" },
  { id: "jp", city: "Tokyo", timezone: "Asia/Tokyo", country: "Japan" },
  { id: "cn", city: "Shanghai", timezone: "Asia/Shanghai", country: "China" },
  { id: "hk", city: "HK", timezone: "Asia/Hong_Kong", country: "Hong Kong" },
  { id: "sg", city: "Singapore", timezone: "Asia/Singapore", country: "Singapore" },
  { id: "in", city: "Mumbai", timezone: "Asia/Kolkata", country: "India" },
  { id: "au-syd", city: "Sydney", timezone: "Australia/Sydney", country: "Australia" },
  { id: "au-mel", city: "Melbourne", timezone: "Australia/Melbourne", country: "Australia" },
  { id: "nz", city: "Auckland", timezone: "Pacific/Auckland", country: "NZ" },
  { id: "br", city: "São Paulo", timezone: "America/Sao_Paulo", country: "Brazil" },
  { id: "mx", city: "Mexico", timezone: "America/Mexico_City", country: "Mexico" },
  { id: "ca", city: "Toronto", timezone: "America/Toronto", country: "Canada" },
  { id: "ru", city: "Moscow", timezone: "Europe/Moscow", country: "Russia" },
  { id: "ae", city: "Dubai", timezone: "Asia/Dubai", country: "UAE" },
  { id: "za", city: "Joburg", timezone: "Africa/Johannesburg", country: "SA" },
  { id: "kr", city: "Seoul", timezone: "Asia/Seoul", country: "S Korea" },
  { id: "es", city: "Madrid", timezone: "Europe/Madrid", country: "Spain" },
  { id: "it", city: "Rome", timezone: "Europe/Rome", country: "Italy" },
  { id: "nl", city: "Amsterdam", timezone: "Europe/Amsterdam", country: "Netherlands" },
  { id: "ch", city: "Zurich", timezone: "Europe/Zurich", country: "Switzerland" },
];

export default function WorldClock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedClocks, setSelectedClocks] = useState<ClockData[]>([WORLD_TIMEZONES[0]]); // Start with local time
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved clocks from API on mount
  useEffect(() => {
    const loadSavedClocks = async () => {
      try {
        const res = await fetch("/api/user/preferences");
        if (res.ok) {
          const data = await res.json();
          const savedClockIds = data.preferences?.worldClocks as string[] | undefined;
          if (savedClockIds && Array.isArray(savedClockIds) && savedClockIds.length > 0) {
            // Rebuild clock objects from saved IDs
            const clocks = savedClockIds
              .map((id) => WORLD_TIMEZONES.find((tz) => tz.id === id))
              .filter((c): c is ClockData => c !== undefined);
            if (clocks.length > 0) {
              setSelectedClocks(clocks);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load saved clocks:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSavedClocks();
  }, []);

  // Save clocks to API (debounced)
  const saveClocks = useCallback((clocks: ClockData[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch("/api/user/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            worldClocks: clocks.map((c) => c.id),
          }),
        });
      } catch (error) {
        console.error("Failed to save clocks:", error);
      }
    }, 500); // Debounce 500ms
  }, []);

  // Save whenever selectedClocks changes (after initial load)
  useEffect(() => {
    if (isLoaded) {
      saveClocks(selectedClocks);
    }
  }, [selectedClocks, isLoaded, saveClocks]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAddModal) return; // Don't handle keys when modal is open
      
      if (selectedIndex === null && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        // Select first clock if none selected
        setSelectedIndex(0);
        e.preventDefault();
        return;
      }

      if (selectedIndex === null) return;

      const cols = 2; // 2 columns in grid
      const totalClocks = selectedClocks.length;

      switch (e.key) {
        case "ArrowUp":
          if (selectedIndex >= cols) {
            // Swap with clock above
            moveClockPosition(selectedIndex, selectedIndex - cols);
          }
          e.preventDefault();
          break;
        case "ArrowDown":
          if (selectedIndex + cols < totalClocks) {
            // Swap with clock below
            moveClockPosition(selectedIndex, selectedIndex + cols);
          }
          e.preventDefault();
          break;
        case "ArrowLeft":
          if (selectedIndex > 0 && selectedIndex % cols !== 0) {
            // Move within same row
            moveClockPosition(selectedIndex, selectedIndex - 1);
          }
          e.preventDefault();
          break;
        case "ArrowRight":
          if (selectedIndex < totalClocks - 1 && (selectedIndex + 1) % cols !== 0) {
            // Move within same row
            moveClockPosition(selectedIndex, selectedIndex + 1);
          }
          e.preventDefault();
          break;
        case "Escape":
          setSelectedIndex(null);
          e.preventDefault();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, selectedClocks, showAddModal]);

  // ESC key to close modal
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showAddModal) {
        setShowAddModal(false);
        setSearchQuery("");
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [showAddModal]);

  const formatTime = (timezone: string) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(currentTime);
  };

  const moveClockPosition = (fromIndex: number, toIndex: number) => {
    const newClocks = [...selectedClocks];
    const [moved] = newClocks.splice(fromIndex, 1);
    newClocks.splice(toIndex, 0, moved);
    setSelectedClocks(newClocks);
    setSelectedIndex(toIndex);
  };

  const addClock = (clock: ClockData) => {
    if (!selectedClocks.find((c) => c.id === clock.id)) {
      setSelectedClocks([...selectedClocks, clock]);
    }
  };

  const removeClock = (clockId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (selectedClocks.length > 1) {
      setSelectedClocks(selectedClocks.filter((c) => c.id !== clockId));
      setSelectedIndex(null);
    }
  };

  const toggleClock = (clock: ClockData) => {
    const isSelected = selectedClocks.find((c) => c.id === clock.id);
    if (isSelected) {
      removeClock(clock.id);
    } else {
      addClock(clock);
    }
  };

  const filteredTimezones = WORLD_TIMEZONES.filter((tz) =>
    tz.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tz.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="w-full border-4 border-gray-300 bg-black font-mono">
        {/* Header */}
        <div className="border-b-4 border-gray-300 px-3 py-1.5 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-[9px] uppercase tracking-widest">
              World Clocks
            </h3>
            {selectedIndex !== null && (
              <span className="text-[#FF0000] text-[7px] font-bold uppercase">
                [ESC TO DESELECT]
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="border-2 border-gray-300 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white hover:bg-white hover:text-black transition-colors"
          >
            + ADD
          </button>
        </div>

        {/* Clock Grid - Square tiles that stack */}
        <div className="p-1.5 grid grid-cols-2 gap-1.5">
          <AnimatePresence mode="popLayout">
            {selectedClocks.map((clock, index) => {
              const isSelected = selectedIndex === index;
              const canRemove = selectedClocks.length > 1;
              return (
                <motion.div
                  key={clock.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setSelectedIndex(index)}
                  className={`aspect-square border-2 bg-[#1A1A1A] transition-all cursor-pointer group relative overflow-hidden ${
                    isSelected 
                      ? "border-[#FF0000] ring-2 ring-[#FF0000]/50" 
                      : "border-gray-700 hover:border-gray-500"
                  }`}
                >
                  {/* Remove button - shows on hover */}
                  {canRemove && (
                    <button
                      onClick={(e) => removeClock(clock.id, e)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#DD0000] text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#FF0000] transition-opacity z-10"
                      title="Remove clock"
                    >
                      ✕
                    </button>
                  )}

                  {/* Clock content */}
                  <div className="flex flex-col items-center justify-center h-full p-1">
                    <div className="text-white text-base font-bold font-mono tracking-tight">
                      {formatTime(clock.timezone)}
                    </div>
                    <div className="text-gray-300 text-[8px] uppercase tracking-wider font-bold text-center mt-0.5">
                      {clock.city}
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2">
                      <div className="text-[#FF0000] text-[6px] font-bold uppercase tracking-wider">
                        ↑ ↓ ← → MOVE
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Instructions footer */}
        {selectedClocks.length > 0 && (
          <div className="border-t-2 border-gray-800 px-2 py-1 bg-black">
            <p className="text-[7px] text-gray-600 uppercase tracking-wide text-center">
              Click to Select • Arrow Keys to Reorder • Hover & Click X to Remove
            </p>
          </div>
        )}
      </div>

      {/* Add Clock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="border-4 border-gray-300 bg-black w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col font-mono"
          >
            {/* Modal Header */}
            <div className="border-b-4 border-gray-300 px-6 py-3 flex items-center justify-between bg-black">
              <h2 className="text-white font-bold text-sm uppercase tracking-widest">
                Add World Clock
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery("");
                }}
                className="border-2 border-gray-300 text-white hover:bg-white hover:text-black w-7 h-7 flex items-center justify-center transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b-2 border-gray-800">
              <input
                type="text"
                placeholder="SEARCH CITIES OR COUNTRIES..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1A1A1A] text-white px-4 py-3 border-2 border-gray-700 focus:border-gray-300 focus:outline-none transition-all font-bold text-[11px] uppercase tracking-wider placeholder:text-gray-600"
              />
            </div>

            {/* Timezone Grid */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {filteredTimezones.map((clock) => {
                  const isAlreadyAdded = !!selectedClocks.find((c) => c.id === clock.id);
                  const isLastClock = isAlreadyAdded && selectedClocks.length === 1;
                  return (
                    <button
                      key={clock.id}
                      onClick={() => toggleClock(clock)}
                      disabled={isLastClock}
                      className={`text-left p-3 border-2 transition-all ${
                        isAlreadyAdded
                          ? isLastClock
                            ? "bg-[#DD0000]/10 border-[#DD0000] opacity-40 cursor-not-allowed"
                            : "bg-[#DD0000]/20 border-[#DD0000] hover:border-white hover:bg-[#DD0000]/30"
                          : "bg-[#1A1A1A] border-gray-700 hover:border-gray-300 hover:bg-black"
                      }`}
                    >
                      <h3 className="text-white font-bold text-[11px] uppercase tracking-wide mb-1">
                        {clock.city}
                      </h3>
                      <p className="text-gray-300 text-[9px] uppercase tracking-wider mb-2">
                        {clock.country}
                      </p>
                      <p className="text-white text-base font-bold font-mono tracking-tight">
                        {formatTime(clock.timezone)}
                      </p>
                      {isAlreadyAdded && (
                        <div className="mt-2">
                          <span className={`text-xs font-bold ${isLastClock ? "text-gray-500" : "text-[#DD0000]"}`}>
                            {isLastClock ? "✓ REQUIRED" : "✓ CLICK TO REMOVE"}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #000;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #444;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #FFF;
        }
      `}} />
    </>
  );
}
