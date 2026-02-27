'use client';

import React, { useMemo } from 'react';
import { MetronomeState, AccentColor } from '@/types/metronome';
import { useRAFPulse, useRAFSubdivisionPulse } from '@/hooks/use-raf-pulse';

interface MetronomeDisplayProps {
  state: MetronomeState & { isPaused?: boolean };
  onBeatClick: (beatIndex: number) => void;
  onColorChange: (color: AccentColor) => void;
  showSettings: boolean;
  onToggleSettings: () => void;
}

// Accent color configuration with enhanced glow effects
const ACCENT_COLORS: Record<AccentColor, { 
  bg: string; 
  border: string; 
  shadow: string; 
  glow: string; 
  rgb: string; 
}> = {
  red: { 
    bg: 'bg-red-400', 
    border: 'border-red-400', 
    shadow: 'shadow-red-400/60', 
    glow: 'shadow-red-400', 
    rgb: '248, 113, 113' 
  },
  blue: { 
    bg: 'bg-blue-400', 
    border: 'border-blue-400', 
    shadow: 'shadow-blue-400/60', 
    glow: 'shadow-blue-400', 
    rgb: '96, 165, 250' 
  },
  green: { 
    bg: 'bg-green-400', 
    border: 'border-green-400', 
    shadow: 'shadow-green-400/60', 
    glow: 'shadow-green-400', 
    rgb: '74, 222, 128' 
  },
  yellow: { 
    bg: 'bg-yellow-300', 
    border: 'border-yellow-300', 
    shadow: 'shadow-yellow-300/60', 
    glow: 'shadow-yellow-300', 
    rgb: '253, 224, 71' 
  },
  purple: { 
    bg: 'bg-purple-400', 
    border: 'border-purple-400', 
    shadow: 'shadow-purple-400/60', 
    glow: 'shadow-purple-400', 
    rgb: '196, 181, 253' 
  },
  orange: { 
    bg: 'bg-orange-400', 
    border: 'border-orange-400', 
    shadow: 'shadow-orange-400/60', 
    glow: 'shadow-orange-400', 
    rgb: '251, 146, 60' 
  },
  pink: { 
    bg: 'bg-pink-400', 
    border: 'border-pink-400', 
    shadow: 'shadow-pink-400/60', 
    glow: 'shadow-pink-400', 
    rgb: '244, 114, 182' 
  },
  cyan: { 
    bg: 'bg-cyan-400', 
    border: 'border-cyan-400', 
    shadow: 'shadow-cyan-400/60', 
    glow: 'shadow-cyan-400', 
    rgb: '34, 211, 238' 
  },
};

// Individual Beat Dot Component to isolate hooks
interface BeatDotProps {
  beatNumber: number;
  beatLevel: 'accent' | 'normal' | 'muted';
  isCurrentBeat: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  bpm: number;
  colors: typeof ACCENT_COLORS[AccentColor];
  subdivisions: number;
  currentSubdivision: number;
  currentBeat: number;
  onBeatClick: (beatIndex: number) => void;
}

function BeatDot({
  beatNumber,
  beatLevel,
  isCurrentBeat,
  isPlaying,
  isPaused,
  bpm,
  colors,
  subdivisions,
  currentSubdivision,
  currentBeat,
  onBeatClick
}: BeatDotProps) {
  const beatIndex = beatNumber - 1;
  const shouldAnimate = isCurrentBeat && isPlaying && !isPaused;
  
  // Use RAF-based pulse animation for perfect sync
  const pulseAnimation = useRAFPulse({
    isActive: shouldAnimate,
    bpm: bpm,
    currentBeat: beatNumber,
    maxOpacity: 1,
    minOpacity: 0.5,
    pulseIntensity: beatLevel === 'accent' ? 1 : 0.8
  });
  
  // Visual states with clear beat level encoding
  const getBaseClasses = () => {
    if (isCurrentBeat) {
      if (beatLevel === 'accent') {
        return `${colors.bg} ${colors.border}`;
      } else if (beatLevel === 'normal') {
        return 'bg-white border-white';
      } else {
        return 'bg-black border-white border-dashed';
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
  
  // Dynamic inline styles for RAF animation
  const getDynamicStyles = () => {
    if (shouldAnimate && isCurrentBeat) {
      return {
        opacity: pulseAnimation.opacity,
        transform: pulseAnimation.transform,
        boxShadow: `0 0 ${Math.round(pulseAnimation.glow * 30)}px rgba(${colors.rgb}, ${pulseAnimation.glow})`,
        filter: pulseAnimation.glow > 0.3 ? `brightness(${1 + pulseAnimation.glow * 0.3})` : 'none'
      };
    } else if (isPaused && isCurrentBeat) {
      // Steady glow for paused state
      return {
        boxShadow: `0 0 15px rgba(${colors.rgb}, 0.6)`
      };
    }
    return {};
  };

  return (
    <button
      onClick={() => onBeatClick(beatIndex)}
      aria-label={`Beat ${beatNumber}: ${beatLevel}${isCurrentBeat ? ' - currently active' : ''}`}
      aria-pressed={beatLevel === 'accent'}
      tabIndex={0}
      style={getDynamicStyles()}
      className={`
        relative w-12 h-12 rounded-full border-3 cursor-pointer
        hover:scale-105 active:scale-95 hover:border-white/80
        focus:ring-2 focus:ring-white/30 focus:outline-none
        transition-colors duration-150
        ${getBaseClasses()}
      `}
    >
      {/* Subdivision indicators with RAF animation */}
      {subdivisions > 1 && (
        <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 flex justify-center space-x-0.5">
          {Array.from({ length: subdivisions }, (_, subIndex) => {
            const subdivision = subIndex + 1;
            const isCurrentSubdivision = 
              beatNumber === currentBeat && 
              subdivision === currentSubdivision && 
              (isPlaying || isPaused) &&
              beatLevel !== 'muted';
            
            return (
              <SubdivisionIndicator
                key={subdivision}
                subdivision={subdivision}
                isCurrentSubdivision={isCurrentSubdivision}
                isPlaying={isPlaying}
                isPaused={isPaused}
                bpm={bpm}
                subdivisions={subdivisions}
                currentSubdivision={currentSubdivision}
                colors={colors}
              />
            );
          })}
        </div>
      )}
    </button>
  );
}

// Subdivision Indicator Component to isolate hooks
interface SubdivisionIndicatorProps {
  subdivision: number;
  isCurrentSubdivision: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  bpm: number;
  subdivisions: number;
  currentSubdivision: number;
  colors: typeof ACCENT_COLORS[AccentColor];
}

function SubdivisionIndicator({
  subdivision,
  isCurrentSubdivision,
  isPlaying,
  isPaused,
  bpm,
  subdivisions,
  currentSubdivision,
  colors
}: SubdivisionIndicatorProps) {
  // RAF-based subdivision animation
  const subdivisionPulse = useRAFSubdivisionPulse({
    isActive: isCurrentSubdivision && isPlaying && !isPaused,
    bpm: bpm,
    subdivisions: subdivisions,
    currentSubdivision: currentSubdivision,
    maxOpacity: 0.9,
    minOpacity: 0.2
  });
  
  const subdivisionStyles = isCurrentSubdivision && isPlaying && !isPaused ? {
    opacity: subdivisionPulse.opacity
  } : {};
  
  let indicatorClass = 'w-1.5 h-1.5 rounded-full transition-colors duration-100';
  
  if (isCurrentSubdivision) {
    indicatorClass += ` ${colors.bg}`;
  } else {
    indicatorClass += ' bg-white/30';
  }
  
  return (
    <div 
      className={indicatorClass}
      style={subdivisionStyles}
      aria-label={`Subdivision ${subdivision}${isCurrentSubdivision ? ' active' : ''}`}
    />
  );
}

export default function MetronomeDisplay({ state, onBeatClick, onColorChange, showSettings, onToggleSettings }: MetronomeDisplayProps) {
  const { currentBeat, currentSubdivision, subdivisions, beatsPerMeasure, isPlaying, accentColor, beatPattern, bpm } = state;
  const isPaused = state.isPaused || false;

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

  // Generate beat dots with proper hook isolation
  const beatDots = useMemo(() => {
    const dots = [];
    for (let beatNumber = 1; beatNumber <= beatsPerMeasure; beatNumber++) {
      const beatIndex = beatNumber - 1;
      const isCurrentBeat = beatNumber === currentBeat && (isPlaying || isPaused);
      const beatLevel = beatPattern[beatIndex] || 'normal';
      
      dots.push(
        <BeatDot
          key={beatNumber}
          beatNumber={beatNumber}
          beatLevel={beatLevel}
          isCurrentBeat={isCurrentBeat}
          isPlaying={isPlaying}
          isPaused={isPaused}
          bpm={bpm}
          colors={colors}
          subdivisions={subdivisions}
          currentSubdivision={currentSubdivision}
          currentBeat={currentBeat}
          onBeatClick={onBeatClick}
        />
      );
    }
    return dots;
  }, [beatsPerMeasure, currentBeat, isPlaying, isPaused, bpm, colors, subdivisions, currentSubdivision, beatPattern, onBeatClick]);

  // Create rows layout with proper spacing
  let beatCounter = 0;
  const createRow = (beatsInRow: number) => {
    const rowBeats = [];
    for (let i = 0; i < beatsInRow; i++) {
      if (beatCounter < beatDots.length) {
        rowBeats.push(beatDots[beatCounter]);
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

      {/* Beat Display with perfect RAF sync */}
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
        {isPlaying ? (isPaused ? ' (paused)' : ' (playing)') : ' (stopped)'}
      </div>
    </div>
  );
}