'use client';

import React, { useState } from 'react';
import { useMetronome } from '@/lib/use-metronome';
import MetronomeDisplay from '@/components/MetronomeDisplay';
import BPMControl from '@/components/BPMControl';
import Controls from '@/components/Controls';

export default function HomePageNew() {
  const { state, isInitialized, error, actions } = useMetronome();
  const [showSettings, setShowSettings] = useState(false);

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
      <div className="flex-1 flex flex-col justify-center px-6 space-y-8">
        
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

        {/* BPM Control */}
        <div className="flex justify-center">
          <BPMControl 
            bpm={state.bpm}
            onBPMChange={actions.setBPM}
            disabled={!isInitialized}
          />
        </div>

        {/* Beats and Subdivisions Control */}
        <Controls 
          state={state}
          onBeatsChange={actions.setBeatsPerMeasure}
          onSubdivisionsChange={actions.setSubdivisions}
        />

        {/* Play/Stop Button - Centered and Large */}
        <div className="flex justify-center">
          <button
            onClick={actions.toggle}
            disabled={!isInitialized}
            className="w-24 h-24 border-4 border-white bg-black rounded-full 
                     hover:bg-white hover:text-black active:scale-95 transition-all duration-200
                     flex items-center justify-center group
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.isPlaying ? (
              // Pause icon - zwei gleich große Rechtecke, perfekt zentriert
              <div className="flex space-x-1.5">
                <div className="w-2.5 h-8 bg-white group-hover:bg-black"></div>
                <div className="w-2.5 h-8 bg-white group-hover:bg-black"></div>
              </div>
            ) : (
              // Play icon - perfekt zentriertes Dreieck
              <div 
                className="w-0 h-0 ml-1"
                style={{
                  borderLeft: '12px solid white',
                  borderTop: '10px solid transparent',
                  borderBottom: '10px solid transparent'
                }}
              ></div>
            )}
          </button>
        </div>

        {/* Quick Controls */}
        <div className="flex justify-center items-center space-x-8">
          <button
            onClick={() => actions.setSoundType(state.soundType === 'click' ? 'clave' : 'click')}
            disabled={!isInitialized}
            className="text-white/60 hover:text-white text-sm font-medium transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.soundType === 'click' ? 'Switch to Clave' : 'Switch to Click'}
          </button>
          
          <button
            onClick={actions.stop}
            disabled={!isInitialized || !state.isPlaying}
            className="text-white/60 hover:text-white text-sm font-bold transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            STOP
          </button>
        </div>
      </div>

      {/* Performance Info */}
      <div className="text-center p-4 border-t border-white/10">
        <div className="text-xs text-white/40">
          {state.beatsPerMeasure} beats × {state.subdivisions} subdivisions = {state.beatsPerMeasure * state.subdivisions} events/measure
          {state.bpm > 200 && state.beatsPerMeasure * state.subdivisions > 20 && (
            <span className="text-yellow-400 ml-2">⚠ High frequency mode</span>
          )}
        </div>
      </div>
    </div>
  );
}