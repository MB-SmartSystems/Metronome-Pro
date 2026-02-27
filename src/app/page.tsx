'use client';

import React, { useState } from 'react';
import { useMetronome } from '@/lib/use-metronome';
import MetronomeDisplay from '@/components/MetronomeDisplay';
import Controls from '@/components/Controls';
import { MetronomeState, AccentColor } from '@/types/metronome';

// Accent color mapping for dynamic styling
const ACCENT_COLORS: Record<AccentColor, { bg: string; border: string; shadow: string; color: string }> = {
  red: { bg: 'bg-red-400', border: 'border-red-400', shadow: 'shadow-red-400/30', color: '#f87171' },
  blue: { bg: 'bg-blue-400', border: 'border-blue-400', shadow: 'shadow-blue-400/30', color: '#60a5fa' },
  green: { bg: 'bg-green-400', border: 'border-green-400', shadow: 'shadow-green-400/30', color: '#4ade80' },
  yellow: { bg: 'bg-yellow-300', border: 'border-yellow-300', shadow: 'shadow-yellow-300/30', color: '#fde047' },
  purple: { bg: 'bg-purple-400', border: 'border-purple-400', shadow: 'shadow-purple-400/30', color: '#c084fc' },
  orange: { bg: 'bg-orange-400', border: 'border-orange-400', shadow: 'shadow-orange-400/30', color: '#fb923c' },
  pink: { bg: 'bg-pink-400', border: 'border-pink-400', shadow: 'shadow-pink-400/30', color: '#f472b6' },
  cyan: { bg: 'bg-cyan-400', border: 'border-cyan-400', shadow: 'shadow-cyan-400/30', color: '#22d3ee' },
};

// PlayStop Button Component with PAUSE/RESUME functionality
function PlayStopButton({ state, onToggle, isInitialized }: { 
  state: MetronomeState & { isPaused?: boolean }; 
  onToggle: () => void; 
  isInitialized: boolean 
}) {
  const colors = ACCENT_COLORS[state.accentColor];
  const { isPlaying, isPaused } = state;
  
  // Button state logic:
  // - Not playing, not paused = Play button (triangle)
  // - Playing, not paused = Pause button (two bars)  
  // - Not playing, paused = Resume button (triangle with different style)
  
  const getButtonContent = () => {
    if (!isPlaying && !isPaused) {
      // Stopped - Show play icon
      return (
        <div 
          className="w-0 h-0 ml-1"
          style={{
            borderLeft: `12px solid ${colors.color}`,
            borderTop: '10px solid transparent',
            borderBottom: '10px solid transparent'
          }}
        />
      );
    } else if (isPlaying && !isPaused) {
      // Playing - Show pause icon (clean hover)
      return (
        <div className="flex space-x-1.5">
          <div className={`w-2.5 h-8 ${colors.bg}`}></div>
          <div className={`w-2.5 h-8 ${colors.bg}`}></div>
        </div>
      );
    } else if (!isPlaying && isPaused) {
      // Paused - Show clean resume icon (no artifacts)
      return (
        <div 
          className="w-0 h-0 ml-1"
          style={{
            borderLeft: `12px solid ${colors.color}`,
            borderTop: '10px solid transparent',
            borderBottom: '10px solid transparent'
          }}
        />
      );
    }
  };
  
  const getButtonLabel = () => {
    if (!isPlaying && !isPaused) return "Start";
    if (isPlaying && !isPaused) return "Pause";
    if (!isPlaying && isPaused) return "Resume";
    return "Toggle";
  };
  
  return (
    <button
      onClick={onToggle}
      disabled={!isInitialized}
      title={getButtonLabel()}
      aria-label={getButtonLabel() + " metronome"}
      aria-pressed={isPlaying && !isPaused}
      className={`w-24 h-24 border-4 ${colors.border} bg-black rounded-full 
                 hover:scale-110 active:scale-95 transition-all duration-200
                 flex items-center justify-center shadow-lg ${colors.shadow}
                 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-white/30`}
    >
      {getButtonContent()}
    </button>
  );
}

export default function HomePage() {
  const { state, isInitialized, error, actions } = useMetronome();
  const [showSettings, setShowSettings] = useState(false);
  const [tapTimes, setTapTimes] = useState<number[]>([]);

  // Keyboard navigation support
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (!isInitialized) return;
    
    switch (event.code) {
      case 'Space':
        event.preventDefault();
        actions.toggle();
        break;
      case 'Escape':
        event.preventDefault();
        actions.stop();
        break;
      case 'ArrowUp':
        event.preventDefault();
        actions.setBPM(Math.min(300, state.bpm + (event.shiftKey ? 10 : 1)));
        break;
      case 'ArrowDown':
        event.preventDefault();
        actions.setBPM(Math.max(40, state.bpm - (event.shiftKey ? 10 : 1)));
        break;
      case 'Enter':
        event.preventDefault();
        handleTap();
        break;
    }
  };

  const handleInitialize = async () => {
    try {
      await actions.initialize();
    } catch (err) {
      console.error('Failed to initialize metronome:', err);
    }
  };

  const handleBeatClick = (beatIndex: number) => {
    actions.cycleBeatLevel(beatIndex);
  };

  const handleColorChange = (color: AccentColor) => {
    actions.setAccentColor(color);
    setShowSettings(false);
  };

  // Enhanced TAP-Tempo with better timing
  const handleTap = () => {
    const now = Date.now();
    const newTapTimes = [...tapTimes, now].slice(-8); // Keep last 8 taps
    setTapTimes(newTapTimes);
    
    if (newTapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTapTimes.length; i++) {
        intervals.push(newTapTimes[i] - newTapTimes[i - 1]);
      }
      
      // Use median instead of average for better accuracy
      intervals.sort((a, b) => a - b);
      const median = intervals[Math.floor(intervals.length / 2)];
      const calculatedBPM = Math.round(60000 / median);
      
      if (calculatedBPM >= 40 && calculatedBPM <= 300) {
        // TAP tempo calculated
        actions.setBPM(calculatedBPM);
      }
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-4">⚠️ Audio Error</h1>
          <p className="text-white/80 mb-6 text-sm leading-relaxed">{error}</p>
          <button
            onClick={handleInitialize}
            className="w-full py-3 border-2 border-white bg-black text-white font-bold rounded-lg
                     hover:bg-white hover:text-black transition-colors"
          >
            Retry Initialization
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-white mb-4">
            🎵 Metronome Pro
          </h1>
          <p className="text-white/60 mb-6">
            Professional metronome with &lt;10ms latency
            <br />
            <span className="text-xs text-white/40">Emergency repair system v2.0</span>
          </p>
          <button
            onClick={handleInitialize}
            className="w-full py-4 border-2 border-white bg-black text-white font-bold rounded-lg text-lg
                     hover:bg-white hover:text-black transition-colors"
          >
            Initialize Audio Engine
          </button>
          <p className="text-xs text-white/40 mt-4">
            Tap to enable audio and start the metronome
          </p>
          <div className="sr-only">
            <h2>Keyboard Controls</h2>
            <ul>
              <li>Space: Play/Pause metronome</li>
              <li>Escape: Stop metronome</li>
              <li>Up/Down arrows: Adjust BPM by 1 (Hold Shift for 10)</li>
              <li>Enter: Tap tempo</li>
              <li>Tab: Navigate between controls</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-black text-white flex flex-col relative focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyPress}
      role="application"
      aria-label="Professional Metronome Application"
    >
      {/* Screen reader live region for status updates */}
      <div 
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {state.isPlaying 
          ? `Metronome playing at ${state.bpm} BPM, beat ${state.currentBeat} of ${state.beatsPerMeasure}`
          : state.isPaused
          ? `Metronome paused at ${state.bpm} BPM, beat ${state.currentBeat} of ${state.beatsPerMeasure}`
          : `Metronome stopped at ${state.bpm} BPM`
        }
      </div>
      {/* Clean header */}
      <header className="flex items-center justify-center p-4 border-b border-white/10 relative">
        <h1 className="text-2xl font-bold text-white">Metronome Pro</h1>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center px-6 space-y-6 pb-24">
        
        {/* Beat Display */}
        <div className="relative">
          <MetronomeDisplay 
            state={state}
            onBeatClick={handleBeatClick}
            onColorChange={handleColorChange}
            showSettings={showSettings}
            onToggleSettings={() => setShowSettings(!showSettings)}
          />
        </div>

        {/* BPM Control with live update indicator */}
        <div className="flex items-center justify-center space-x-4 md:space-x-6">
          {/* Left Controls - Mobile Touch Optimized */}
          <div className="flex flex-col items-center space-x-0 space-y-3">
            <button
              onClick={() => actions.setBPM(Math.max(40, state.bpm - 5))}
              disabled={!isInitialized || state.bpm <= 40}
              aria-label="Decrease BPM by 5"
              className="w-14 h-14 rounded-full border-2 border-white bg-black text-white font-bold text-sm
                       hover:bg-white hover:text-black active:scale-95 transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white
                       md:w-12 md:h-12"
            >
              -5
            </button>
            <button
              onClick={() => actions.setBPM(Math.max(40, state.bpm - 1))}
              disabled={!isInitialized || state.bpm <= 40}
              aria-label="Decrease BPM by 1"
              className="w-14 h-14 rounded-full border-2 border-white bg-black text-white font-bold text-sm
                       hover:bg-white hover:text-black active:scale-95 transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white
                       md:w-12 md:h-12"
            >
              -1
            </button>
          </div>

          {/* Central BPM Display - Mobile Optimized */}
          <div className="flex flex-col items-center">
            <div className="text-center mb-2 relative">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={state.bpm}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 40 && value <= 300) {
                    actions.setBPM(value);
                  }
                }}
                onFocus={(e) => e.target.select()}
                disabled={!isInitialized}
                min={40}
                max={300}
                aria-label="Beats per minute"
                className="w-40 h-24 text-6xl font-mono font-bold text-center 
                         bg-transparent border-2 border-transparent text-white outline-none
                         touch-none focus:border-white/30 rounded-lg px-2
                         disabled:opacity-50 disabled:cursor-not-allowed
                         [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                         md:w-32 md:h-20 md:border-none"
              />

              <div className="text-white text-lg font-medium">BPM</div>
            </div>
          </div>

          {/* Right Controls - Mobile Touch Optimized */}
          <div className="flex flex-col items-center space-x-0 space-y-3">
            <button
              onClick={() => actions.setBPM(Math.min(300, state.bpm + 5))}
              disabled={!isInitialized || state.bpm >= 300}
              aria-label="Increase BPM by 5"
              className="w-14 h-14 rounded-full border-2 border-white bg-black text-white font-bold text-sm
                       hover:bg-white hover:text-black active:scale-95 transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white
                       md:w-12 md:h-12"
            >
              +5
            </button>
            <button
              onClick={() => actions.setBPM(Math.min(300, state.bpm + 1))}
              disabled={!isInitialized || state.bpm >= 300}
              aria-label="Increase BPM by 1"
              className="w-14 h-14 rounded-full border-2 border-white bg-black text-white font-bold text-sm
                       hover:bg-white hover:text-black active:scale-95 transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white
                       md:w-12 md:h-12"
            >
              +1
            </button>
          </div>
        </div>

        {/* Subdivision and Beat Controls with live update indicators */}
        <div className="relative">
          <Controls 
            state={state}
            onBeatsChange={actions.setBeatsPerMeasure}
            onSubdivisionsChange={actions.setSubdivisions}
          />

        </div>

        {/* Play/Pause/Resume Button */}
        <div className="flex justify-center">
          <PlayStopButton state={state} onToggle={actions.toggle} isInitialized={isInitialized} />
        </div>

        {/* Clean UI - removed placeholder features */}
      </div>

      {/* Bottom Controls - Clean Design */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 p-4">
        <div className="flex justify-center items-center space-x-8">          
          <button
            onClick={handleTap}
            disabled={!isInitialized}
            aria-label="Tap tempo to set BPM"
            className="px-8 py-3 border-2 border-white bg-black text-white font-bold text-lg rounded-full
                     hover:bg-white hover:text-black active:scale-95 transition-all duration-150
                     shadow-lg shadow-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            TAP
            {tapTimes.length > 0 && (
              <span className="ml-2 text-xs">({tapTimes.length}/8)</span>
            )}
          </button>
          
          <button 
            onClick={actions.stop}
            disabled={!isInitialized || (!state.isPlaying && !state.isPaused)}
            aria-label="Stop metronome"
            className="px-4 py-2 border-2 border-red-500 bg-black text-red-500 rounded-full text-sm font-bold
                     hover:bg-red-500 hover:text-black transition-all duration-150
                     disabled:opacity-30 disabled:cursor-not-allowed disabled:border-white disabled:text-white"
          >
            ● STOP
          </button>
        </div>
      </div>
    </div>
  );
}