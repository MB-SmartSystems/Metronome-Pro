'use client';

import React from 'react';

interface SubdivisionControlProps {
  subdivisions: number;
  onSubdivisionsChange: (subdivisions: number) => void;
  bpm: number;
  disabled?: boolean;
}

export default function SubdivisionControl({ 
  subdivisions, 
  onSubdivisionsChange, 
  bpm,
  disabled 
}: SubdivisionControlProps) {
  const maxSubdivisions = 6;
  const eventsPerSecond = (bpm * subdivisions) / 60;

  const subdivisionOptions = Array.from({ length: maxSubdivisions }, (_, i) => i + 1);

  const getSubdivisionLabel = (sub: number): string => {
    switch (sub) {
      case 1: return 'Quarter';
      case 2: return '8th';
      case 3: return 'Triplet';
      case 4: return '16th';
      case 5: return 'Quintuplet';
      case 6: return 'Sextuplet';
      default: return `${sub}x`;
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      {/* Title */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-1">
          Subdivisions
        </h3>
        <p className="text-sm text-white/60">
          {eventsPerSecond.toFixed(1)} events/sec
        </p>
        {eventsPerSecond > 20 && (
          <p className="text-xs text-red-400 mt-1">
            ⚠️ High frequency mode
          </p>
        )}
      </div>

      {/* Subdivision selector */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        {subdivisionOptions.map((sub) => {
          const isSelected = sub === subdivisions;
          const eventsForThis = (bpm * sub) / 60;
          const isHighFreq = eventsForThis > 20;
          
          return (
            <button
              key={sub}
              onClick={() => onSubdivisionsChange(sub)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200
                flex flex-col items-center space-y-1
                ${isSelected 
                  ? 'bg-white border-white text-black shadow-lg' 
                  : 'bg-black border-white/30 text-white hover:border-white/60'
                }
                ${isHighFreq && !isSelected ? 'border-red-400/50' : ''}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {/* Subdivision number */}
              <span className="text-2xl font-bold">
                {sub}
              </span>
              
              {/* Subdivision label */}
              <span className="text-xs font-medium">
                {getSubdivisionLabel(sub)}
              </span>
              
              {/* Events per second */}
              <span className="text-xs opacity-75">
                {eventsForThis.toFixed(1)}/s
              </span>
              
              {/* High frequency warning */}
              {isHighFreq && (
                <span className="absolute -top-1 -right-1 text-xs">
                  ⚠️
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Visual representation */}
      <div className="w-full max-w-md">
        <div className="text-xs text-white/60 mb-2 text-center">
          Beat pattern preview:
        </div>
        <div className="flex items-center justify-center space-x-1 p-4 bg-black border border-white/20 rounded-lg">
          {/* One beat with subdivisions */}
          {Array.from({ length: subdivisions }, (_, i) => (
            <div
              key={i}
              className={`
                w-3 h-3 rounded-full
                ${i === 0 
                  ? 'bg-red-400' 
                  : 'bg-white'
                }
              `}
              title={i === 0 ? 'Accent' : 'Subdivision'}
            />
          ))}
          
          {/* Separator */}
          <div className="w-px h-6 bg-white/30 mx-2" />
          
          {/* Next beat (normal) */}
          {Array.from({ length: subdivisions }, (_, i) => (
            <div
              key={`next-${i}`}
              className={`
                w-3 h-3 rounded-full
                ${i === 0 
                  ? 'bg-white opacity-60' 
                  : 'bg-white opacity-40'
                }
              `}
              title={i === 0 ? 'Normal beat' : 'Subdivision'}
            />
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex justify-center space-x-4 mt-2 text-xs text-white/60">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-400 rounded-full" />
            <span>Accent</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-white opacity-60 rounded-full" />
            <span>Normal</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-white rounded-full" />
            <span>Subdivision</span>
          </div>
        </div>
      </div>
    </div>
  );
}