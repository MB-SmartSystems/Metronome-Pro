'use client';

import React from 'react';
import { MetronomeState, AccentColor } from '@/types/metronome';
import { useSmoothPulse } from '@/hooks/use-smooth-pulse';

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

  // Smooth pulse animation for the current beat
  const pulseOpacity = useSmoothPulse({
    isActive: isPlaying && !isPaused,
    duration: 600, // 600ms pulse cycle
    maxOpacity: 1,
    minOpacity: 0.6,
  });

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
    const shouldAnimate = isCurrentBeat && isPlaying && !isPaused;
    
    // Visual states with clear beat level encoding (accent/normal/muted)
    const getVisualState = () => {
      if (isCurrentBeat) {
        if (isPaused) {
          // Paused state - steady glow without animation
          if (beatLevel === 'accent') {
            return `${colors.bg} ${colors.border} ${colors.shadow} shadow-lg scale-110`;
          } else if (beatLevel === 'normal') {
            return 'bg-white border-white shadow-white/50 shadow-lg scale-110';
          } else {
            return 'bg-black border-white border-dashed scale-110';
          }
        } else if (isPlaying) {
          // Playing state - smooth animated pulse (no CSS animate-pulse)
          if (beatLevel === 'accent') {
            return `${colors.bg} ${colors.border} ${colors.shadow} shadow-lg scale-110`;
          } else if (beatLevel === 'normal') {
            return 'bg-white border-white shadow-white/50 shadow-lg scale-110';
          } else {
            return 'bg-black border-white border-dashed scale-110';
          }
        }
      }
      
      // Inactive beat - show beat level with visual hierarchy
      if (beatLevel === 'accent') {
        return `bg-transparent ${colors.border} border-2`;
      } else if (beatLevel === 'normal') {
        return 'bg-transparent border-white border-2';
      } else {
        return 'bg-transparent border-white/40 border-2 border-dashed';
      }
    };
    
    // Apply smooth pulse opacity when animating
    const getInlineStyle = () => {
      if (shouldAnimate && isCurrentBeat) {
        return { opacity: pulseOpacity };
      }
      return {};
    };

    // Text color based on beat state
    const textColor = (() => {
      if (isCurrentBeat && (beatLevel === 'accent' || beatLevel === 'normal')) {
        return 'text-black';
      }
      // Show visual differentiation for muted beats
      if (beatLevel === 'muted') {
        return 'text-white/40';
      }
      return 'text-white/70';
    })();

    return (
      <button
        key={beatNumber}
        onClick={() => onBeatClick(beatIndex)}
        aria-label={`Beat ${beatNumber}: ${beatLevel}${isCurrentBeat ? ' - currently active' : ''}`}
        aria-pressed={beatLevel === 'accent'}
        tabIndex={0}
        style={getInlineStyle()}
        className={`
          relative w-12 h-12 rounded-full border-3 cursor-pointer
          hover:scale-105 active:scale-95 hover:border-white/80
          focus:ring-2 focus:ring-white/30 focus:outline-none
          ${isCurrentBeat ? 'transition-all duration-75' : 'transition-all duration-150'}
          ${getVisualState()}
        `}
      >
        {/* Clean dot design - NO NUMBERS */}
        
        {/* Subdivision indicators - SIMPLIFIED */}
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
                indicatorClass += ` ${colors.bg}`;
                if (isPlaying && !isPaused) {
                  indicatorClass += ' animate-pulse';
                }
              } else {
                indicatorClass += ' bg-white/30';
              }
              
              return (
                <div 
                  key={subdivision} 
                  className={indicatorClass}
                  aria-label={`Subdivision ${subdivision}${isCurrentSubdivision ? ' active' : ''}`}
                />
              );
            })}
          </div>
        )}
      </button>
    );
  };

  // Create rows layout with proper spacing
  let beatCounter = 1;
  const createRow = (beatsInRow: number) => {
    const rowBeats = [];
    for (let i = 0; i < beatsInRow; i++) {
      if (beatCounter <= beatsPerMeasure) {
        rowBeats.push(generateBeatDot(beatCounter));
        beatCounter++;
      }
    }
    return rowBeats;
  };

  const colorOptions: AccentColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Settings Button - Color selector */}
      <div className="relative">
        <button
          onClick={onToggleSettings}
          className={`w-8 h-8 rounded-full ${colors.bg} ${colors.border} border-2 
                     hover:scale-110 active:scale-95 transition-all duration-150
                     shadow-lg ${colors.shadow} focus:ring-2 focus:ring-white/30`}
          aria-label="Change accent color"
          aria-expanded={showSettings}
        />
        
        {showSettings && (
          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-50
                        bg-gray-900 border border-gray-600 rounded-lg p-4 shadow-xl
                        animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  className={`w-8 h-8 rounded-full ${ACCENT_COLORS[color].bg} border-2
                           ${color === accentColor ? 'border-white' : 'border-transparent'}
                           hover:scale-110 active:scale-95 transition-all duration-150`}
                  aria-label={`Set accent color to ${color}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Beat Display */}
      <div className="flex flex-col items-center space-y-8">
        {layout.rows.map((beatsInRow, rowIndex) => (
          <div key={rowIndex} className={`flex justify-center ${layout.spacing}`}>
            {createRow(beatsInRow)}
          </div>
        ))}
      </div>
      
      {/* Status indication for screen readers */}
      <div className="sr-only" aria-live="polite">
        Current beat: {currentBeat} of {beatsPerMeasure}
        {subdivisions > 1 && `, subdivision ${currentSubdivision} of ${subdivisions}`}
      </div>
    </div>
  );
}