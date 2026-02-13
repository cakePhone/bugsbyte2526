/**
 * Geisha Gains - Coffee Pot Component
 * Coffee Driven Development - BugsByte 2026
 * 
 * The Caffeine Overdrive meter
 */

'use client';

import { useUberCharge } from '@/contexts/UberChargeContext';

export function CoffeePot() {
  const { charge, isOverdrive, overdriveTimeRemaining, activateOverdrive } = useUberCharge();

  const canActivate = charge >= 100 && !isOverdrive;

  return (
    <div className="border-4 border-black bg-white p-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-black uppercase tracking-tight">
          CAFFEINE METER
        </h2>
        {isOverdrive && (
          <div className="mt-2 bg-red-600 text-white px-3 py-1 text-sm font-black glitch-text">
            [OVERDRIVE ACTIVE]
          </div>
        )}
      </div>

      {/* Coffee Pot Visual */}
      <div className="relative h-64 w-full border-4 border-black bg-white mb-4">
        {/* Coffee Fill */}
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
            isOverdrive ? 'bg-red-600 glitch-anim' : 'bg-black'
          }`}
          style={{ height: `${charge}%` }}
        >
          {/* Steam/Bubbles effect when near full */}
          {charge > 80 && !isOverdrive && (
            <div className="absolute top-0 left-0 right-0 h-8 overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-white rounded-full animate-float"
                  style={{
                    left: `${20 + i * 15}%`,
                    animationDelay: `${i * 0.3}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Percentage Display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-6xl font-black ${
              charge > 50 ? 'text-white' : 'text-black'
            }`}
          >
            {Math.floor(charge)}%
          </span>
        </div>
      </div>

      {/* Overdrive Timer */}
      {isOverdrive && (
        <div className="mb-4 border-4 border-black bg-red-600 p-3">
          <div className="text-white font-black text-xl text-center">
            TIME REMAINING:{' '}
            {Math.floor(overdriveTimeRemaining / 60)}:
            {String(overdriveTimeRemaining % 60).padStart(2, '0')}
          </div>
        </div>
      )}

      {/* Activate Button */}
      <button
        onClick={activateOverdrive}
        disabled={!canActivate}
        className={`w-full border-4 border-black p-4 font-black text-xl uppercase transition-colors ${
          canActivate
            ? 'bg-black text-white hover:bg-red-500 hover:text-white cursor-pointer'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isOverdrive
          ? 'OVERDRIVE ACTIVE'
          : canActivate
          ? '☕ ACTIVATE CAFFEINE OVERDRIVE'
          : `CHARGING... ${Math.floor(charge)}%`}
      </button>

      {/* Info */}
      <div className="mt-4 border-4 border-black p-3 text-xs">
        <p className="font-bold mb-1">OVERDRIVE MODE:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Bypasses AI confidence check</li>
          <li>Executes trades on ANY positive signal</li>
          <li>Duration: 5 minutes</li>
          <li>Gain: +1% every 5 seconds or from successful trades</li>
        </ul>
      </div>
    </div>
  );
}
