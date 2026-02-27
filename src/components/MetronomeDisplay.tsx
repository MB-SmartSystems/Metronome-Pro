'use client';

import React from 'react';
import { MetronomeState, BeatLevel, AccentColor } from '@/types/metronome';

interface MetronomeDisplayProps {
  state: MetronomeState & { isPaused?: boolean };
  onBeatClick: (beatIndex: number) => void;
  onColorChange: (color: AccentColor) => void;
  showSettings: boolean;
  onToggleSettings: () => void;
}

// Accent color configuration
const ACCENT_COLORS: Record<AccentColor, { bg: string; border: string; shadow: string }> = {
  red: { bg: 'bg-red-400', border: 'border-red-400', shadow: 'shadow-red-400/60' },
  blue: { bg: 'bg-blue-400', border: 'border-blue-400', shadow: 'shadow-blue-400/60' },
  green: { bg: 'bg-green-400', border: 'border-green-400', shadow: 'shadow-green-400/60' },
  yellow: { bg: 'bg-yellow-300', border: 'border-yellow-300', shadow: 'shadow-yellow-300/60' },
  purple: { bg: 'bg-purple-400', border: 'border-purple-400', shadow: 'shadow-purple-400/60' },
  orange: { bg: 'bg-orange-400', border: 'border-orange-400', shadow: 'shadow-orange-400/60' },
  pink: { bg: 'bg-pink-400', border: 'border-pink-400', shadow: 'shadow-pink-400/60' },
  cyan: { bg: 'bg-cyan-400', border: 'border-cyan-400', shadow: 'shadow-cyan-400/60' },
};

export default function MetronomeDisplay({ state, onBeatClick, onColorChange, showSettings, onToggleSettings }: MetronomeDisplayProps) {
  const { currentBeat, currentSubdivision, subdivisions, beatsPerMeasure, isPlaying, isPaused, accentColor, beatPattern } = state;

  // Calculate optimal layout - FIXED SPACING
  const calculateLayout = (totalBeats: number) => {
    if (totalBeats <= 6) {
      return { rows: [totalBeats], spacing: 'space-x-6' };
    } else if (totalBeats <= 8) {
      return { rows: [totalBeats], spacing: 'space-x-4' };
    } else if (totalBeats === 9) {
      return { rows: [5, 4], spacing: 'space-x-4' };
    } else if (totalBeats <= 12) {
      const firstRow = Math.ceil(totalBeats / 2);
      const secondRow = totalBeats - firstRow;
      return { rows: [firstRow, secondRow], spacing: 'space-x-3' };
    } else {
      // For larger beat counts, use 3 rows
      const beatsPerRow = Math.ceil(totalBeats / 3);
      const firstRow = Math.min(beatsPerRow, totalBeats);
      const secondRow = Math.min(beatsPerRow, totalBeats - firstRow);
      const thirdRow = totalBeats - firstRow - secondRow;
      
      return { 
        rows: thirdRow > 0 ? [firstRow, secondRow, thirdRow] : [firstRow, secondRow], 
        spacing: 'space-x-2' 
      };
    }
  };

  const layout = calculateLayout(beatsPerMeasure);
  const colors = ACCENT_COLORS[accentColor];

  // Generate individual beat dot
  const generateBeatDot = (beatNumber: number) => {
    const beatIndex = beatNumber - 1;
    const isCurrentBeat = beatNumber === currentBeat && (isPlaying || isPaused);
    const beatLevel = beatPattern[beatIndex] || 'normal';
    
    // Visual states with proper pause indication
    const getVisualState = () => {
      if (isCurrentBeat) {
        if (isPaused) {
          // Paused state - steady glow without animation
          if (beatLevel === 'accent') {
            return `${colors.bg} ${colors.border} ${colors.shadow} shadow-lg scale-110`;
          } else if (beatLevel === 'normal') {
            return 'bg-white border-white shadow-white/50 shadow-lg scale-110';
          } else {
            return 'bg-black border-white scale-110';
          }
        } else if (isPlaying) {
          // Playing state - animated
          if (beatLevel === 'accent') {
            return `${colors.bg} ${colors.border} ${colors.shadow} shadow-lg animate-pulse scale-110`;
          } else if (beatLevel === 'normal') {
            return 'bg-white border-white shadow-white/50 shadow-lg animate-pulse scale-110';
          } else {
            return 'bg-black border-white animate-pulse scale-110';
          }
        }
      }
      
      // Inactive beat - clean white ring
      return 'bg-transparent border-white/50';
    };

    const getTextColor = () => {
      if (isCurrentBeat && (beatLevel === 'accent' || beatLevel === 'normal') && !isPaused) {
        return 'text-black';
      }
      if (isCurrentBeat && isPaused && (beatLevel === 'accent' || beatLevel === 'normal')) {
        return 'text-black';
      }
      return 'text-white/70';
    };

    return (
      <button
        key={beatNumber}
        onClick={() => onBeatClick(beatIndex)}
        className={`
          relative w-12 h-12 rounded-full border-3 cursor-pointer
          hover:scale-105 active:scale-95 hover:border-white/80
          ${isCurrentBeat ? 'transition-all duration-75' : 'transition-all duration-150'}
          ${getVisualState()}
        `}
      >
        <span className={`
          absolute inset-0 flex items-center justify-center text-sm font-bold
          ${getTextColor()}
        `}>
          {beatNumber}
        </span>
        
        {/* Subdivision indicators - FIXED POSITIONING */}
        {subdivisions > 1 && (
          <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 flex justify-center space-x-0.5">
            {Array.from({ length: subdivisions }, (_, subIndex) => {
              const subdivision = subIndex + 1;
              const isCurrentSubdivision = 
                beatNumber === currentBeat && 
                subdivision === currentSubdivision && 
                (isPlaying || isPaused) &&
                beatLevel !== 'muted';
              
              let indicatorClass = 'w-1.5 h-1.5 rounded-full transition-all duration-75';
              
              if (isCurrentSubdivision) {
                if (isPaused) {
                  indicatorClass += ` ${colors.bg}`; // Solid color when paused
                } else {
                  indicatorClass += ` ${colors.bg} animate-pulse`; // Animated when playing
                }
              } else {
                indicatorClass += ' bg-white/30';
              }
              
              return (
                <div key={subdivision} className={indicatorClass} />
              );
            })}
          </div>
        )}
      </button>
    );
  };

  // Render beat rows with proper spacing
  const renderBeatRows = () => {
    let beatCounter = 1;
    
    return layout.rows.map((beatsInRow, rowIndex) => (
      <div key={rowIndex} className={`flex justify-center ${layout.spacing} mb-6`}>
        {Array.from({ length: beatsInRow }, () => generateBeatDot(beatCounter++))}
      </div>
    ));
  };

  return (
    <div className="flex flex-col items-center p-4 relative">
      {/* Settings Button */}
      <div className="absolute top-2 right-2">
        <button
          onClick={onToggleSettings}
          className="w-8 h-8 rounded-full border-2 border-white/30 bg-black 
                   hover:border-white/60 transition-colors flex items-center justify-center"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-12 right-2 bg-black border-2 border-white/20 rounded-lg p-3 z-10 shadow-xl">
          <h3 className="text-white text-xs font-bold mb-2">Accent Colors</h3>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((color) => {
              const colorConfig = ACCENT_COLORS[color];
              return (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  className={`
                    w-6 h-6 rounded border-2 transition-all
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

      {/* Status indicator for pause */}
      {isPaused && (
        <div className="absolute top-2 left-2 text-xs text-white/60 bg-black/50 px-2 py-1 rounded">
          PAUSED
        </div>
      )}

      {/* Beat Dots - Properly Spaced Multi-Row Layout */}
      <div className="flex flex-col items-center">
        {renderBeatRows()}
      </div>

      {/* Visual spacing for subdivisions when present */}
      {subdivisions > 1 && (
        <div className="h-4" />
      )}
    </div>
  );
}