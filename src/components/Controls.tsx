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
    <div className="flex justify-center items-center space-x-8">
      {/* Schläge Dropdown */}
      <div className="flex flex-col items-center space-y-2">
        <label className="text-white/70 text-sm font-medium">Schläge</label>
        <div className="relative">
          <select 
            value={beatsPerMeasure}
            onChange={(e) => onBeatsChange(parseInt(e.target.value))}
            className="bg-gray-800 border-2 border-gray-600 text-white px-6 py-3 pr-12 rounded-lg
                     appearance-none focus:outline-none focus:border-cyan-400 focus:bg-gray-700
                     text-lg font-bold min-w-[100px] cursor-pointer
                     hover:border-cyan-300 transition-colors"
          >
            {beatOptions.map((beats) => (
              <option key={beats} value={beats} className="bg-gray-800 text-white">
                {beats}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Klicks Dropdown */}
      <div className="flex flex-col items-center space-y-2">
        <label className="text-white/70 text-sm font-medium">Klicks</label>
        <div className="relative">
          <select 
            value={subdivisions}
            onChange={(e) => onSubdivisionsChange(parseInt(e.target.value))}
            className="bg-gray-800 border-2 border-gray-600 text-white px-6 py-3 pr-12 rounded-lg
                     appearance-none focus:outline-none focus:border-cyan-400 focus:bg-gray-700
                     text-lg font-bold min-w-[100px] cursor-pointer
                     hover:border-cyan-300 transition-colors"
          >
            {subdivisionOptions.map((sub) => (
              <option key={sub} value={sub} className="bg-gray-800 text-white">
                {sub}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}