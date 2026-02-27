'use client';

import React, { useState, useCallback } from 'react';

interface BPMControlProps {
  bpm: number;
  onBPMChange: (bpm: number) => void;
  disabled?: boolean;
}

export default function BPMControl({ bpm, onBPMChange, disabled }: BPMControlProps) {
  const [inputValue, setInputValue] = useState(bpm.toString());

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 40 && numValue <= 240) {
      onBPMChange(numValue);
    }
  }, [onBPMChange]);

  const incrementBPM = useCallback((delta: number) => {
    const newBPM = Math.max(40, Math.min(240, bpm + delta));
    onBPMChange(newBPM);
    setInputValue(newBPM.toString());
  }, [bpm, onBPMChange]);

  // Preset BPM values
  const presets = [60, 80, 100, 120, 140, 160, 180];

  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      {/* Main BPM display */}
      <div className="text-center">
        <label className="text-sm text-metronom-muted mb-2 block">
          BPM (Beats Per Minute)
        </label>
        
        <div className="flex items-center space-x-4">
          {/* Decrement buttons */}
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => incrementBPM(-10)}
              disabled={disabled || bpm <= 40}
              className="w-12 h-8 bg-metronom-surface border border-metronom-muted 
                       hover:bg-metronom-muted/20 disabled:opacity-50 disabled:cursor-not-allowed
                       rounded text-sm font-bold text-metronom-text transition-colors"
            >
              -10
            </button>
            <button
              onClick={() => incrementBPM(-1)}
              disabled={disabled || bpm <= 40}
              className="w-12 h-8 bg-metronom-surface border border-metronom-muted 
                       hover:bg-metronom-muted/20 disabled:opacity-50 disabled:cursor-not-allowed
                       rounded text-sm font-bold text-metronom-text transition-colors"
            >
              -1
            </button>
          </div>

          {/* BPM Input */}
          <div className="text-center">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={() => setInputValue(bpm.toString())}
              disabled={disabled}
              min={40}
              max={240}
              className="w-24 h-16 text-4xl font-mono font-bold text-center 
                       bg-metronom-surface border-2 border-metronom-primary 
                       rounded-lg text-metronom-text
                       focus:outline-none focus:border-metronom-accent
                       disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="text-xs text-metronom-muted mt-1">
              {(60 / bpm).toFixed(2)}s per beat
            </div>
          </div>

          {/* Increment buttons */}
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => incrementBPM(1)}
              disabled={disabled || bpm >= 240}
              className="w-12 h-8 bg-metronom-surface border border-metronom-muted 
                       hover:bg-metronom-muted/20 disabled:opacity-50 disabled:cursor-not-allowed
                       rounded text-sm font-bold text-metronom-text transition-colors"
            >
              +1
            </button>
            <button
              onClick={() => incrementBPM(10)}
              disabled={disabled || bpm >= 240}
              className="w-12 h-8 bg-metronom-surface border border-metronom-muted 
                       hover:bg-metronom-muted/20 disabled:opacity-50 disabled:cursor-not-allowed
                       rounded text-sm font-bold text-metronom-text transition-colors"
            >
              +10
            </button>
          </div>
        </div>
      </div>

      {/* BPM Range Slider */}
      <div className="w-full max-w-md">
        <input
          type="range"
          min={40}
          max={240}
          value={bpm}
          onChange={(e) => {
            const newBPM = parseInt(e.target.value, 10);
            onBPMChange(newBPM);
            setInputValue(newBPM.toString());
          }}
          disabled={disabled}
          className="w-full h-2 bg-metronom-surface rounded-lg appearance-none cursor-pointer
                   disabled:opacity-50 disabled:cursor-not-allowed
                   slider"
          style={{
            background: `linear-gradient(to right, 
              #22c55e 0%, 
              #22c55e ${((bpm - 40) / (240 - 40)) * 100}%, 
              #1a1a1a ${((bpm - 40) / (240 - 40)) * 100}%, 
              #1a1a1a 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-metronom-muted mt-1">
          <span>40</span>
          <span>240</span>
        </div>
      </div>

      {/* Preset BPMs */}
      <div className="flex flex-wrap gap-2 justify-center">
        <span className="text-xs text-metronom-muted mb-2 w-full text-center">
          Quick presets:
        </span>
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => {
              onBPMChange(preset);
              setInputValue(preset.toString());
            }}
            disabled={disabled}
            className={`
              px-3 py-1 rounded text-sm font-medium transition-colors
              ${bpm === preset 
                ? 'bg-metronom-primary text-metronom-bg' 
                : 'bg-metronom-surface border border-metronom-muted text-metronom-text hover:bg-metronom-muted/20'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}