'use client';

import React from 'react';
import { MetronomeState } from '@/types/metronome';

interface ControlsProps {
  state: MetronomeState;
  onBeatsChange: (beats: number) => void;
  onSubdivisionsChange: (subdivisions: number) => void;
}

export default function Controls({ state, onBeatsChange, onSubdivisionsChange }: ControlsProps) {
  const { beatsPerMeasure, subdivisions } = state;

  // Beat-Optionen (erweitert auf 16)
  const beatOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  
  // Subdivision-Optionen (erweitert auf 6)
  const subdivisionOptions = [1, 2, 3, 4, 5, 6];

  return (
    <div className="flex flex-col items-center space-y-8">
      {/* Beats Per Measure Control */}
      <div className="flex flex-col items-center space-y-3">
        <label className="text-white/80 text-sm font-medium">Schläge pro Takt</label>
        <div className="flex flex-wrap justify-center gap-2 max-w-md">
          {beatOptions.map((beats) => (
            <button
              key={beats}
              onClick={() => onBeatsChange(beats)}
              className={`
                px-4 py-2 rounded-full font-medium text-sm transition-all duration-150
                min-w-[3rem] border-2
                ${beatsPerMeasure === beats
                  ? 'bg-white text-black border-white shadow-lg'
                  : 'bg-black text-white border-white/40 hover:border-white/70 hover:bg-white/10'
                }
                active:scale-95
              `}
            >
              {beats}
            </button>
          ))}
        </div>
      </div>

      {/* Subdivisions Control */}
      <div className="flex flex-col items-center space-y-3">
        <label className="text-white/80 text-sm font-medium">Unterteilungen pro Schlag</label>
        <div className="flex justify-center gap-2">
          {subdivisionOptions.map((sub) => (
            <button
              key={sub}
              onClick={() => onSubdivisionsChange(sub)}
              className={`
                px-5 py-2 rounded-full font-medium text-sm transition-all duration-150
                min-w-[3rem] border-2
                ${subdivisions === sub
                  ? 'bg-white text-black border-white shadow-lg'
                  : 'bg-black text-white border-white/40 hover:border-white/70 hover:bg-white/10'
                }
                active:scale-95
              `}
            >
              {sub}
            </button>
          ))}
        </div>
        <div className="text-white/60 text-xs text-center">
          Max: {beatsPerMeasure} × {subdivisions} = {beatsPerMeasure * subdivisions} events/sec @ 240 BPM
        </div>
      </div>
    </div>
  );
}