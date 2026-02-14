"use client";

import { useState, useEffect } from "react";
import { motion, Reorder } from "framer-motion";

interface ClockData {
  id: string;
  city: string;
  timezone: string;
  country: string;
}

const WORLD_TIMEZONES: ClockData[] = [
  { id: "local", city: "Local Time", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, country: "Local" },
  { id: "us-ny", city: "New York", timezone: "America/New_York", country: "USA" },
  { id: "us-la", city: "Los Angeles", timezone: "America/Los_Angeles", country: "USA" },
  { id: "us-chi", city: "Chicago", timezone: "America/Chicago", country: "USA" },
  { id: "uk", city: "London", timezone: "Europe/London", country: "United Kingdom" },
  { id: "fr", city: "Paris", timezone: "Europe/Paris", country: "France" },
  { id: "de", city: "Berlin", timezone: "Europe/Berlin", country: "Germany" },
  { id: "jp", city: "Tokyo", timezone: "Asia/Tokyo", country: "Japan" },
  { id: "cn", city: "Shanghai", timezone: "Asia/Shanghai", country: "China" },
  { id: "hk", city: "Hong Kong", timezone: "Asia/Hong_Kong", country: "Hong Kong" },
  { id: "sg", city: "Singapore", timezone: "Asia/Singapore", country: "Singapore" },
  { id: "in", city: "Mumbai", timezone: "Asia/Kolkata", country: "India" },
  { id: "au-syd", city: "Sydney", timezone: "Australia/Sydney", country: "Australia" },
  { id: "au-mel", city: "Melbourne", timezone: "Australia/Melbourne", country: "Australia" },
  { id: "nz", city: "Auckland", timezone: "Pacific/Auckland", country: "New Zealand" },
  { id: "br", city: "São Paulo", timezone: "America/Sao_Paulo", country: "Brazil" },
  { id: "mx", city: "Mexico City", timezone: "America/Mexico_City", country: "Mexico" },
  { id: "ca", city: "Toronto", timezone: "America/Toronto", country: "Canada" },
  { id: "ru", city: "Moscow", timezone: "Europe/Moscow", country: "Russia" },
  { id: "ae", city: "Dubai", timezone: "Asia/Dubai", country: "UAE" },
  { id: "za", city: "Johannesburg", timezone: "Africa/Johannesburg", country: "South Africa" },
  { id: "kr", city: "Seoul", timezone: "Asia/Seoul", country: "South Korea" },
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (timezone: string) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(currentTime);
  };

  const formatDate = (timezone: string) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(currentTime);
  };

  const addClock = (clock: ClockData) => {
    if (!selectedClocks.find((c) => c.id === clock.id)) {
      setSelectedClocks([...selectedClocks, clock]);
    }
  };

  const removeClock = (clockId: string) => {
    setSelectedClocks(selectedClocks.filter((c) => c.id !== clockId));
  };

  const toggleClock = (clock: ClockData) => {
    const isSelected = selectedClocks.find((c) => c.id === clock.id);
    if (isSelected) {
      removeClock(clock.id);
    } else {
      addClock(clock);
      setShowAddModal(false);
      setSearchQuery("");
    }
  };

  const filteredTimezones = WORLD_TIMEZONES.filter((tz) =>
    tz.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tz.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="w-full h-full border-4 border-gray-300 bg-black overflow-hidden font-mono flex flex-col">
        {/* Header */}
        <div className="border-b-4 border-gray-300 px-4 py-3 flex items-center justify-between bg-black flex-shrink-0">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 bg-[#DD0000]"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <h3 className="text-white font-bold text-[11px] uppercase tracking-widest">
              World Clocks
            </h3>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="border-2 border-gray-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white hover:text-black transition-colors"
          >
            + ADD
          </button>
        </div>

        {/* Clock List */}
        <Reorder.Group
          axis="y"
          values={selectedClocks}
          onReorder={setSelectedClocks}
          className="flex-1 overflow-y-auto custom-scrollbar min-h-0"
        >
          {selectedClocks.map((clock, index) => (
            <Reorder.Item
              key={clock.id}
              value={clock}
              className={`px-4 py-4 ${index !== selectedClocks.length - 1 ? 'border-b-2 border-gray-800' : ''} hover:bg-[#1A1A1A] transition-colors group cursor-move`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 mr-2 opacity-50 group-hover:opacity-100 transition-opacity">
                  <svg 
                    width="12" 
                    height="16" 
                    viewBox="0 0 12 16" 
                    fill="none" 
                    className="text-gray-300"
                  >
                    <circle cx="3" cy="4" r="1.5" fill="currentColor"/>
                    <circle cx="9" cy="4" r="1.5" fill="currentColor"/>
                    <circle cx="3" cy="8" r="1.5" fill="currentColor"/>
                    <circle cx="9" cy="8" r="1.5" fill="currentColor"/>
                    <circle cx="3" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-bold text-[12px] uppercase tracking-wide">
                      {clock.city}
                    </h4>
                    <button
                      onClick={() => removeClock(clock.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#DD0000] hover:text-white text-[11px] font-bold transition-opacity border border-transparent hover:border-gray-300 px-1"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-gray-300 text-[10px] uppercase tracking-wider mb-2">
                    {clock.country}
                  </p>
                  <p className="text-white text-2xl font-bold font-mono tracking-tight">
                    {formatTime(clock.timezone)}
                  </p>
                  <p className="text-gray-300 text-[10px] uppercase tracking-wider mt-1">
                    {formatDate(clock.timezone)}
                  </p>
                </div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      {/* Add Clock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="border-4 border-gray-300 bg-black w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col font-mono">
            {/* Modal Header */}
            <div className="border-b-4 border-gray-300 px-6 py-3 flex items-center justify-between bg-black">
              <h2 className="text-white font-bold text-sm uppercase tracking-widest">
                Add World Clock
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
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

            {/* Timezone List */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredTimezones.map((clock) => {
                  const isSelected = selectedClocks.find((c) => c.id === clock.id);
                  return (
                    <button
                      key={clock.id}
                      onClick={() => toggleClock(clock)}
                      className={`text-left p-3 border-2 transition-all ${
                        isSelected
                          ? "bg-[#DD0000]/20 border-[#DD0000] hover:border-gray-300 hover:bg-[#DD0000]/30"
                          : "bg-[#1A1A1A] border-gray-700 hover:border-gray-300 hover:bg-black"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-bold text-[11px] uppercase tracking-wide mb-1">
                            {clock.city}
                          </h3>
                          <p className="text-gray-300 text-[9px] uppercase tracking-wider mb-2">
                            {clock.country}
                          </p>
                          <p className="text-white text-base font-bold font-mono tracking-tight">
                            {formatTime(clock.timezone)}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="text-[#DD0000] text-lg font-bold">✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
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
      `}</style>
    </>
  );
}
