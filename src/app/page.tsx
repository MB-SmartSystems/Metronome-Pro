'use client';

import React, { useState } from 'react';
import { useMetronome } from '@/lib/use-metronome';

export default function HomePage() {
  const { state, isInitialized, error, actions } = useMetronome();
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [tempoTrainer, setTempoTrainer] = useState(false);
  const [gapTrainer, setGapTrainer] = useState(false);
  const [beats, setBeats] = useState(4);

  const handleInitialize = async () => {
    try {
      await actions.initialize();
    } catch (err) {
      console.error('Failed to initialize metronome:', err);
    }
  };

  const handleTap = () => {
    const now = Date.now();
    const newTapTimes = [...tapTimes, now].slice(-4);
    setTapTimes(newTapTimes);
    
    if (newTapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTapTimes.length; i++) {
        intervals.push(newTapTimes[i] - newTapTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
      const bpm = Math.round(60000 / avgInterval);
      if (bpm >= 40 && bpm <= 240) {
        actions.setBPM(bpm);
      }
    }
  };

  const changeBPM = (delta: number) => {
    const newBPM = Math.max(40, Math.min(240, state.bpm + delta));
    actions.setBPM(newBPM);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-white mb-6">{error}</p>
          <button
            onClick={handleInitialize}
            className="w-full py-3 border-2 border-white bg-black text-white font-bold rounded-lg
                     hover:bg-white hover:text-black transition-colors"
          >
            Retry
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
            Metronom Pro
          </h1>
          <p className="text-white/60 mb-6">
            Professional metronome with &lt;10ms latency
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* 1. HEADER - Nur "Metronom Pro" zentral */}
      <header className="flex items-center justify-center p-4 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white">Metronom Pro</h1>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center px-6">
        
        {/* 2. BEAT-DOTS - Synchrone Audio-Visual Animation */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-8 mb-4">
            {Array.from({ length: beats }, (_, i) => i + 1).map((beat) => {
              const isActiveBeat = beat === state.currentBeat && state.isPlaying;
              return (
                <button
                  key={beat}
                  className={`
                    w-12 h-12 rounded-full border-2 border-white transition-all duration-75
                    ${isActiveBeat 
                      ? 'bg-white scale-110 shadow-white shadow-lg' 
                      : 'bg-black hover:bg-white/10 scale-100'
                    }
                  `}
                  style={{
                    // Force immediate visual feedback for beat accuracy
                    transform: isActiveBeat ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 75ms ease-out'
                  }}
                />
              );
            })}
          </div>
          <p className="text-white/60 text-sm">
            Tippe auf einen Punkt: Normal • Akzent • Stumm
          </p>
        </div>

        {/* 3. BPM-SECTION */}
        <div className="flex items-center justify-center space-x-12 mb-12">
          {/* Left Controls */}
          <div className="flex flex-col space-y-4">
            <button
              onClick={() => changeBPM(-5)}
              className="w-12 h-12 border-2 border-white bg-black text-white font-bold text-lg
                       hover:bg-white hover:text-black active:scale-95 transition-all duration-150"
              disabled={state.bpm <= 40}
            >
              -5
            </button>
            <button
              onClick={() => changeBPM(-1)}
              className="w-12 h-12 border-2 border-white bg-black text-white font-bold text-lg
                       hover:bg-white hover:text-black active:scale-95 transition-all duration-150"
              disabled={state.bpm <= 40}
            >
              -1
            </button>
          </div>

          {/* Central BPM Display */}
          <div className="text-center">
            <div className="text-9xl font-bold text-white font-mono leading-none mb-2">
              {state.bpm}
            </div>
            <div className="text-white text-xl font-medium">BPM</div>
          </div>

          {/* Right Controls */}
          <div className="flex flex-col space-y-4">
            <button
              onClick={() => changeBPM(1)}
              className="w-12 h-12 border-2 border-white bg-black text-white font-bold text-lg
                       hover:bg-white hover:text-black active:scale-95 transition-all duration-150"
              disabled={state.bpm >= 240}
            >
              +1
            </button>
            <button
              onClick={() => changeBPM(5)}
              className="w-12 h-12 border-2 border-white bg-black text-white font-bold text-lg
                       hover:bg-white hover:text-black active:scale-95 transition-all duration-150"
              disabled={state.bpm >= 240}
            >
              +5
            </button>
          </div>
        </div>

        {/* 4. DROPDOWNS */}
        <div className="flex justify-center space-x-8 mb-8">
          <div className="relative">
            <select 
              className="bg-black border border-white text-white px-4 py-3 pr-10 appearance-none
                       focus:outline-none focus:border-white/60 text-lg font-medium"
              value={beats}
              onChange={(e) => setBeats(parseInt(e.target.value))}
            >
              <option value={2}>Schläge: 2</option>
              <option value={3}>Schläge: 3</option>
              <option value={4}>Schläge: 4</option>
              <option value={6}>Schläge: 6</option>
            </select>
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white text-lg">▼</span>
          </div>
          <div className="relative">
            <select 
              className="bg-black border border-white text-white px-4 py-3 pr-10 appearance-none
                       focus:outline-none focus:border-white/60 text-lg font-medium"
              value={state.subdivisions}
              onChange={(e) => actions.setSubdivisions(parseInt(e.target.value))}
            >
              <option value={1}>Klicks: 1</option>
              <option value={2}>Klicks: 2</option>
              <option value={3}>Klicks: 3</option>
              <option value={4}>Klicks: 4</option>
            </select>
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white text-lg">▼</span>
          </div>
        </div>

        {/* 5. CHECKBOXES */}
        <div className="flex justify-center space-x-12 mb-12">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input 
              type="checkbox"
              checked={tempoTrainer}
              onChange={(e) => setTempoTrainer(e.target.checked)}
              className="w-5 h-5 bg-black border-2 border-white appearance-none checked:bg-white
                       focus:outline-none focus:ring-0"
              style={{
                backgroundImage: tempoTrainer ? 'url("data:image/svg+xml,%3csvg viewBox=\'0 0 16 16\' fill=\'black\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3cpath d=\'m13.854 3.646-1.708-1.708L6 8.086 3.854 5.939l-1.708 1.707L6 11.5l7.854-7.854z\'/%3e%3c/svg%3e")' : 'none'
              }}
            />
            <span className="text-white text-lg">Tempo-Trainer</span>
          </label>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input 
              type="checkbox"
              checked={gapTrainer}
              onChange={(e) => setGapTrainer(e.target.checked)}
              className="w-5 h-5 bg-black border-2 border-white appearance-none checked:bg-white
                       focus:outline-none focus:ring-0"
              style={{
                backgroundImage: gapTrainer ? 'url("data:image/svg+xml,%3csvg viewBox=\'0 0 16 16\' fill=\'black\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3cpath d=\'m13.854 3.646-1.708-1.708L6 8.086 3.854 5.939l-1.708 1.707L6 11.5l7.854-7.854z\'/%3e%3c/svg%3e")' : 'none'
              }}
            />
            <span className="text-white text-lg">Gap-Trainer</span>
          </label>
        </div>

        {/* 6. GROSSER PLAY-BUTTON */}
        <div className="flex justify-center mb-12">
          <button
            onClick={actions.toggle}
            className="w-32 h-32 border-4 border-white bg-black rounded-full 
                     hover:bg-white hover:text-black active:scale-95 transition-all duration-200
                     flex items-center justify-center group"
          >
            {state.isPlaying ? (
              // Pause icon - two white rectangles
              <div className="flex space-x-2">
                <div className="w-3 h-12 bg-white group-hover:bg-black"></div>
                <div className="w-3 h-12 bg-white group-hover:bg-black"></div>
              </div>
            ) : (
              // Play icon - white triangle
              <div className="w-0 h-0 border-l-[16px] border-l-white group-hover:border-l-black 
                            border-t-[12px] border-t-transparent 
                            border-b-[12px] border-b-transparent ml-2">
              </div>
            )}
          </button>
        </div>
      </div>

      {/* 7. BOTTOM-CONTROLS */}
      <div className="flex justify-center items-center space-x-12 p-6 border-t border-white/10">
        <button className="text-white/60 hover:text-white text-lg">
          Shaker
        </button>
        <button
          onClick={handleTap}
          className="text-white hover:text-white/60 text-3xl font-bold py-2 px-6 border-2 border-white/30 rounded-lg
                   hover:border-white transition-colors"
        >
          TAP
        </button>
        <button 
          onClick={actions.stop}
          className="text-white/60 hover:text-white text-lg font-semibold"
        >
          STOP
        </button>
      </div>
    </div>
  );
}