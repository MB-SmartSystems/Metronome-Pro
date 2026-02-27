'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface BPMControlProps {
  bpm: number;
  onBPMChange: (bpm: number) => void;
  disabled?: boolean;
}

export default function BPMControl({ bpm, onBPMChange, disabled }: BPMControlProps) {
  const [inputValue, setInputValue] = useState(bpm.toString());
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const lastTapRef = useRef<number>(0);

  // Sync input value when BPM changes externally
  useEffect(() => {
    setInputValue(bpm.toString());
  }, [bpm]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 40 && numValue <= 300) {
      onBPMChange(numValue);
    }
  }, [onBPMChange]);

  const changeBPM = useCallback((delta: number) => {
    const newBPM = Math.max(40, Math.min(300, bpm + delta));
    onBPMChange(newBPM);
    setInputValue(newBPM.toString());
  }, [bpm, onBPMChange]);

  // Verbessertes Tap-Tempo: Durchschnitt der letzten 8 Schläge
  const handleTap = useCallback(() => {
    const now = Date.now();
    const newTapTimes = [...tapTimes, now].slice(-8); // Letzte 8 Taps behalten
    setTapTimes(newTapTimes);
    
    if (newTapTimes.length >= 2) {
      // Berechne Intervalle zwischen allen aufeinanderfolgenden Taps
      const intervals = [];
      for (let i = 1; i < newTapTimes.length; i++) {
        intervals.push(newTapTimes[i] - newTapTimes[i - 1]);
      }
      
      // Durchschnitt aller Intervalle
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
      const calculatedBPM = Math.round(60000 / avgInterval);
      
      // Validierung und Anwendung
      if (calculatedBPM >= 40 && calculatedBPM <= 300) {
        onBPMChange(calculatedBPM);
        setInputValue(calculatedBPM.toString());
      }
    }
    
    lastTapRef.current = now;
  }, [tapTimes, onBPMChange]);

  // Reset tap times if too much time has passed
  useEffect(() => {
    const resetTapTimes = () => {
      if (tapTimes.length > 0 && Date.now() - lastTapRef.current > 3000) {
        setTapTimes([]);
      }
    };
    
    const interval = setInterval(resetTapTimes, 1000);
    return () => clearInterval(interval);
  }, [tapTimes.length]);

  return (
    <div className="flex items-center justify-center space-x-8">
      {/* Left Controls */}
      <div className="flex flex-col items-center space-y-3">
        <button
          onClick={() => changeBPM(-5)}
          disabled={disabled || bpm <= 40}
          className="w-12 h-12 rounded-full border-2 border-white bg-black text-white font-bold text-sm
                   hover:bg-white hover:text-black active:scale-95 transition-all duration-150
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white"
        >
          -5
        </button>
        <button
          onClick={() => changeBPM(-1)}
          disabled={disabled || bpm <= 40}
          className="w-12 h-12 rounded-full border-2 border-white bg-black text-white font-bold text-sm
                   hover:bg-white hover:text-black active:scale-95 transition-all duration-150
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white"
        >
          -1
        </button>
      </div>

      {/* Central BPM Display */}
      <div className="flex flex-col items-center">
        {/* Clickable BPM Display */}
        <div className="text-center mb-2">
          <input
            type="number"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={() => setInputValue(bpm.toString())}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            min={40}
            max={300}
            className="w-32 h-20 text-6xl font-mono font-bold text-center 
                     bg-transparent border-none text-white outline-none
                     disabled:opacity-50 disabled:cursor-not-allowed
                     [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div className="text-white text-lg font-medium">BPM</div>
          <div className="text-white/60 text-sm">
            {(60 / bpm).toFixed(2)}s/beat
          </div>
        </div>

        {/* Tap Tempo Button */}
        <button
          onClick={handleTap}
          disabled={disabled}
          className="px-6 py-2 border-2 border-white/60 bg-black text-white font-bold text-lg rounded-full
                   hover:border-white hover:bg-white hover:text-black active:scale-95 transition-all duration-150
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          TAP
        </button>
        {tapTimes.length > 0 && (
          <div className="text-white/60 text-xs mt-1">
            {tapTimes.length}/8 taps
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex flex-col items-center space-y-3">
        <button
          onClick={() => changeBPM(5)}
          disabled={disabled || bpm >= 300}
          className="w-12 h-12 rounded-full border-2 border-white bg-black text-white font-bold text-sm
                   hover:bg-white hover:text-black active:scale-95 transition-all duration-150
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white"
        >
          +5
        </button>
        <button
          onClick={() => changeBPM(1)}
          disabled={disabled || bpm >= 300}
          className="w-12 h-12 rounded-full border-2 border-white bg-black text-white font-bold text-sm
                   hover:bg-white hover:text-black active:scale-95 transition-all duration-150
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white"
        >
          +1
        </button>
      </div>
    </div>
  );
}