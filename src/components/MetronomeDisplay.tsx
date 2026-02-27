'use client';

import React from 'react';
import { MetronomeState } from '@/types/metronome';

interface MetronomeDisplayProps {
  state: MetronomeState;
}

export default function MetronomeDisplay({ state }: MetronomeDisplayProps) {
  const { currentBeat, currentSubdivision, subdivisions, isPlaying } = state;

  // Generate beat indicators
  const beatIndicators = [];
  for (let beat = 1; beat <= 4; beat++) {
    const isCurrentBeat = beat === currentBeat && isPlaying;
    
    beatIndicators.push(
      <div
        key={beat}
        className={`
          relative w-16 h-16 rounded-full border-4 transition-all duration-75
          ${isCurrentBeat 
            ? 'bg-metronom-accent border-metronom-accent shadow-lg shadow-metronom-accent/50 animate-pulse-beat' 
            : 'bg-metronom-surface border-metronom-muted'
          }
        `}
      >
        <span className={`
          absolute inset-0 flex items-center justify-center text-xl font-bold
          ${isCurrentBeat ? 'text-metronom-bg' : 'text-metronom-text'}
        `}>
          {beat}
        </span>
        
        {/* Subdivision indicators */}
        {subdivisions > 1 && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-1">
            {Array.from({ length: subdivisions }, (_, subIndex) => {
              const subdivision = subIndex + 1;
              const isCurrentSubdivision = 
                beat === currentBeat && 
                subdivision === currentSubdivision && 
                isPlaying;
              
              return (
                <div
                  key={subdivision}
                  className={`
                    w-2 h-2 rounded-full transition-all duration-75
                    ${isCurrentSubdivision 
                      ? 'bg-metronom-primary animate-flash' 
                      : 'bg-metronom-muted/50'
                    }
                  `}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-12 p-8">
      {/* Beat indicators */}
      <div className="flex space-x-6">
        {beatIndicators}
      </div>
      
      {/* Current position display */}
      <div className="text-center">
        <div className="text-4xl font-mono font-bold text-metronom-text">
          {currentBeat}.{currentSubdivision}
        </div>
        <div className="text-sm text-metronom-muted mt-1">
          Beat • Subdivision
        </div>
      </div>
    </div>
  );
}