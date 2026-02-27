'use client';

import React, { useState } from 'react';
import { useMetronome } from '@/lib/use-metronome';
import MetronomeDisplay from '@/components/MetronomeDisplay';
import Controls from '@/components/Controls';

export default function HomePageNew() {
  const { state, isInitialized, error, actions } = useMetronome();
  const [showSettings, setShowSettings] = useState(false);
  const [tapTimes, setTapTimes] = useState<number[]>([]);

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

  const handleColorChange = (color: any) => {
    actions.setAccentColor(color);
    setShowSettings(false); // Close settings after selection
  };

  // TAP-Tempo mit 8-Schlag-Durchschnitt
  const handleTap = () => {
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
        actions.setBPM(calculatedBPM);
      }
    }
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
    <div className="min-h-screen bg-black text-white flex flex-col relative">
      {/* Header */}
      <header className="flex items-center justify-center p-4 border-b border-white/10 relative">
        <h1 className="text-2xl font-bold text-white">Metronom Pro</h1>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center px-6 space-y-8 pb-24">
        
        {/* Beat Display with Settings */}
        <div className="relative">
          <MetronomeDisplay 
            state={state}
            onBeatClick={handleBeatClick}
            onColorChange={handleColorChange}
            showSettings={showSettings}
            onToggleSettings={() => setShowSettings(!showSettings)}
          />
        </div>

        {/* BPM Control ohne TAP */}
        <div className="flex items-center justify-center space-x-8">
          {/* Left Controls */}
          <div className="flex flex-col items-center space-y-3">
            <button
              onClick={() => actions.setBPM(Math.max(40, state.bpm - 5))}
              disabled={!isInitialized || state.bpm <= 40}
              className="w-12 h-12 rounded-full border-2 border-cyan-400 bg-black text-cyan-400 font-bold text-sm
                       hover:bg-cyan-400 hover:text-black active:scale-95 transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-cyan-400"
            >
              -5
            </button>
            <button
              onClick={() => actions.setBPM(Math.max(40, state.bpm - 1))}
              disabled={!isInitialized || state.bpm <= 40}
              className="w-12 h-12 rounded-full border-2 border-cyan-400 bg-black text-cyan-400 font-bold text-sm
                       hover:bg-cyan-400 hover:text-black active:scale-95 transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-cyan-400"
            >
              -1
            </button>
          </div>

          {/* Central BPM Display */}
          <div className="flex flex-col items-center">
            <div className="text-center mb-2">
              <input
                type="number"
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
                className="w-32 h-20 text-6xl font-mono font-bold text-center 
                         bg-transparent border-none text-white outline-none
                         disabled:opacity-50 disabled:cursor-not-allowed
                         [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="text-white text-lg font-medium">BPM</div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex flex-col items-center space-y-3">
            <button
              onClick={() => actions.setBPM(Math.min(300, state.bpm + 5))}
              disabled={!isInitialized || state.bpm >= 300}
              className="w-12 h-12 rounded-full border-2 border-cyan-400 bg-black text-cyan-400 font-bold text-sm
                       hover:bg-cyan-400 hover:text-black active:scale-95 transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-cyan-400"
            >
              +5
            </button>
            <button
              onClick={() => actions.setBPM(Math.min(300, state.bpm + 1))}
              disabled={!isInitialized || state.bpm >= 300}
              className="w-12 h-12 rounded-full border-2 border-cyan-400 bg-black text-cyan-400 font-bold text-sm
                       hover:bg-cyan-400 hover:text-black active:scale-95 transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-cyan-400"
            >
              +1
            </button>
          </div>
        </div>

        {/* Dropdown Controls for Beats and Subdivisions */}
        <Controls 
          state={state}
          onBeatsChange={actions.setBeatsPerMeasure}
          onSubdivisionsChange={actions.setSubdivisions}
        />

        {/* Play/Stop Button - Knallig und zentral */}
        <div className="flex justify-center">
          <button
            onClick={actions.toggle}
            disabled={!isInitialized}
            className="w-24 h-24 border-4 border-orange-400 bg-black rounded-full 
                     hover:bg-orange-400 hover:border-orange-500 active:scale-95 transition-all duration-200
                     flex items-center justify-center group shadow-lg shadow-orange-400/30
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.isPlaying ? (
              // Pause icon - zwei gleich große Rechtecke, perfekt zentriert
              <div className="flex space-x-1.5">
                <div className="w-2.5 h-8 bg-orange-400 group-hover:bg-black"></div>
                <div className="w-2.5 h-8 bg-orange-400 group-hover:bg-black"></div>
              </div>
            ) : (
              // Play icon - perfekt zentriertes Dreieck
              <div 
                className="w-0 h-0 ml-1"
                style={{
                  borderLeft: '12px solid #fb923c',
                  borderTop: '10px solid transparent',
                  borderBottom: '10px solid transparent'
                }}
              ></div>
            )}
          </button>
        </div>

        {/* Checkboxes - wie im DrumTempo Design */}
        <div className="flex justify-center space-x-8">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input 
              type="checkbox"
              className="w-4 h-4 bg-black border-2 border-gray-600 rounded appearance-none checked:bg-cyan-400 checked:border-cyan-400
                       focus:outline-none focus:ring-0 cursor-pointer"
            />
            <span className="text-white/70 text-sm">Tempo-Trainer</span>
          </label>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input 
              type="checkbox"
              className="w-4 h-4 bg-black border-2 border-gray-600 rounded appearance-none checked:bg-cyan-400 checked:border-cyan-400
                       focus:outline-none focus:ring-0 cursor-pointer"
            />
            <span className="text-white/70 text-sm">Gap-Trainer</span>
          </label>
        </div>
      </div>

      {/* Bottom Controls - TAP-Button wie in DrumTempo */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 p-4">
        <div className="flex justify-center items-center space-x-8">
          <button 
            className="px-4 py-2 border-2 border-gray-600 bg-black text-white/60 rounded-full text-sm
                     hover:border-gray-500 transition-colors"
            disabled={!isInitialized}
          >
            🔊 Shaker
          </button>
          
          <button
            onClick={handleTap}
            disabled={!isInitialized}
            className="px-8 py-3 border-2 border-pink-500 bg-black text-pink-400 font-bold text-lg rounded-full
                     hover:bg-pink-500 hover:text-black active:scale-95 transition-all duration-150
                     shadow-lg shadow-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            TAP
            {tapTimes.length > 0 && (
              <span className="ml-2 text-xs">({tapTimes.length}/8)</span>
            )}
          </button>
          
          <button 
            onClick={actions.stop}
            disabled={!isInitialized || !state.isPlaying}
            className="px-4 py-2 border-2 border-red-500 bg-black text-red-400 rounded-full text-sm font-bold
                     hover:bg-red-500 hover:text-black transition-all duration-150
                     disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ● STOP
          </button>
        </div>
      </div>
    </div>
  );
}