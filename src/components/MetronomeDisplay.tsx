'use client';

import React from 'react';
import { MetronomeState, BeatLevel, AccentColor } from '@/types/metronome';

interface MetronomeDisplayProps {
  state: MetronomeState;
  onBeatClick: (beatIndex: number) => void;
  onColorChange: (color: AccentColor) => void;
  showSettings: boolean;
  onToggleSettings: () => void;
}

// Farbkonfiguration für Akzente
const ACCENT_COLORS: Record<AccentColor, { bg: string; border: string; shadow: string }> = {
  red: { bg: 'bg-red-500', border: 'border-red-500', shadow: 'shadow-red-500/50' },
  blue: { bg: 'bg-blue-500', border: 'border-blue-500', shadow: 'shadow-blue-500/50' },
  green: { bg: 'bg-green-500', border: 'border-green-500', shadow: 'shadow-green-500/50' },
  yellow: { bg: 'bg-yellow-500', border: 'border-yellow-500', shadow: 'shadow-yellow-500/50' },
  purple: { bg: 'bg-purple-500', border: 'border-purple-500', shadow: 'shadow-purple-500/50' },
  orange: { bg: 'bg-orange-500', border: 'border-orange-500', shadow: 'shadow-orange-500/50' },
  pink: { bg: 'bg-pink-500', border: 'border-pink-500', shadow: 'shadow-pink-500/50' },
  cyan: { bg: 'bg-cyan-500', border: 'border-cyan-500', shadow: 'shadow-cyan-500/50' },
};

export default function MetronomeDisplay({ state, onBeatClick, onColorChange, showSettings, onToggleSettings }: MetronomeDisplayProps) {
  const { currentBeat, currentSubdivision, subdivisions, beatsPerMeasure, isPlaying, accentColor, beatPattern } = state;

  // Berechnung des Dot-Layouts (zweizeilig bei >8 Dots)
  const calculateLayout = (totalBeats: number) => {
    if (totalBeats <= 8) {
      return { rows: [totalBeats], maxPerRow: totalBeats };
    }
    
    if (totalBeats === 9) return { rows: [5, 4], maxPerRow: 5 };
    if (totalBeats === 15) return { rows: [8, 7], maxPerRow: 8 };
    
    // Allgemeine Regel: gleichmäßig verteilen
    const firstRow = Math.ceil(totalBeats / 2);
    const secondRow = totalBeats - firstRow;
    return { rows: [firstRow, secondRow], maxPerRow: Math.max(firstRow, secondRow) };
  };

  const layout = calculateLayout(beatsPerMeasure);
  const colors = ACCENT_COLORS[accentColor];

  // Beat-Dot-Generator
  const generateBeatDot = (beatNumber: number) => {
    const beatIndex = beatNumber - 1;
    const isCurrentBeat = beatNumber === currentBeat && isPlaying;
    const beatLevel = beatPattern[beatIndex] || 'normal';
    
    // Visuelle Zustände
    const getVisualState = () => {
      if (isCurrentBeat) {
        // Aktiver Beat - je nach Level
        if (beatLevel === 'accent') {
          return `${colors.bg} ${colors.border} ${colors.shadow} shadow-lg animate-pulse scale-110`;
        } else if (beatLevel === 'normal') {
          return 'bg-white border-white shadow-white/50 shadow-lg animate-pulse scale-110';
        } else {
          // Stumm - nur Border-Animation
          return 'bg-black border-white animate-pulse scale-110';
        }
      } else {
        // Inaktiver Beat - Zustand anzeigen
        if (beatLevel === 'accent') {
          return `${colors.bg} ${colors.border} opacity-60`;
        } else if (beatLevel === 'normal') {
          return 'bg-white/20 border-white opacity-60';
        } else {
          // Stumm - durchsichtig
          return 'bg-transparent border-white/30';
        }
      }
    };

    return (
      <button
        key={beatNumber}
        onClick={() => onBeatClick(beatIndex)}
        className={`
          relative w-14 h-14 rounded-full border-4 transition-all duration-75 cursor-pointer
          hover:scale-105 active:scale-95
          ${getVisualState()}
        `}
      >
        <span className={`
          absolute inset-0 flex items-center justify-center text-sm font-bold
          ${isCurrentBeat || beatLevel === 'accent' ? 'text-black' : 'text-white'}
        `}>
          {beatNumber}
        </span>
        
        {/* Subdivision-Indikatoren */}
        {subdivisions > 1 && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
            {Array.from({ length: subdivisions }, (_, subIndex) => {
              const subdivision = subIndex + 1;
              const isCurrentSubdivision = 
                beatNumber === currentBeat && 
                subdivision === currentSubdivision && 
                isPlaying &&
                beatLevel !== 'muted'; // Keine Subdivision-Animation bei stummem Beat
              
              return (
                <div
                  key={subdivision}
                  className={`
                    w-1.5 h-1.5 rounded-full transition-all duration-50
                    ${isCurrentSubdivision 
                      ? `${colors.bg} animate-flash` 
                      : 'bg-white/30'
                    }
                  `}
                />
              );
            })}
          </div>
        )}
      </button>
    );
  };

  // Beat-Dots in Zeilen rendern
  const renderBeatRows = () => {
    let beatCounter = 1;
    
    return layout.rows.map((beatsInRow, rowIndex) => (
      <div key={rowIndex} className="flex justify-center space-x-4 mb-8">
        {Array.from({ length: beatsInRow }, () => generateBeatDot(beatCounter++))}
      </div>
    ));
  };

  return (
    <div className="flex flex-col items-center space-y-8 p-6">
      {/* Settings Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={onToggleSettings}
          className="w-10 h-10 rounded-full border-2 border-white/30 bg-black 
                   hover:border-white/60 transition-colors flex items-center justify-center"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 bg-black border-2 border-white/20 rounded-lg p-4 z-10">
          <h3 className="text-white text-sm font-bold mb-3">Akzent-Farben</h3>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((color) => {
              const colorConfig = ACCENT_COLORS[color];
              return (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  className={`
                    w-8 h-8 rounded border-2 transition-all
                    ${colorConfig.bg}
                    ${accentColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}
                  `}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Beat Dots - Multi-Row Layout */}
      <div className="flex flex-col items-center space-y-4">
        {renderBeatRows()}
      </div>
      
      {/* Instruktionen */}
      <div className="text-center">
        <p className="text-white/60 text-sm mb-2">
          Klicke auf Punkte: Normal → Akzent → Stumm
        </p>
        <div className="flex items-center justify-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${colors.bg}`}></div>
            <span className="text-white/60">Akzent</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-white"></div>
            <span className="text-white/60">Normal</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full border border-white/40"></div>
            <span className="text-white/60">Stumm</span>
          </div>
        </div>
      </div>

      {/* Current Position Display */}
      <div className="text-center">
        <div className="text-3xl font-mono font-bold text-white">
          {currentBeat}.{currentSubdivision}
        </div>
        <div className="text-sm text-white/60 mt-1">
          Beat • Subdivision
        </div>
      </div>
    </div>
  );
}