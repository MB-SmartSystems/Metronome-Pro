'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MetronomeEngine } from './metronome-engine';
import { MetronomeState, SoundType } from '@/types/metronome';

export function useMetronome() {
  const engineRef = useRef<MetronomeEngine | null>(null);
  const [state, setState] = useState<MetronomeState>({
    isPlaying: false,
    bpm: 120,
    subdivisions: 1,
    currentBeat: 1,
    currentSubdivision: 1,
    soundType: 'click'
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize metronome engine
  const initialize = useCallback(async () => {
    if (engineRef.current || isInitialized) return;

    try {
      const engine = new MetronomeEngine();
      await engine.initialize();
      engineRef.current = engine;
      setIsInitialized(true);
      
      // Sync initial state
      setState(engine.getState());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize metronome');
    }
  }, [isInitialized]);

  // Start metronome
  const start = useCallback(async () => {
    if (!engineRef.current) {
      await initialize();
    }
    
    if (engineRef.current && !state.isPlaying) {
      engineRef.current.start();
      setState(engineRef.current.getState());
    }
  }, [initialize, state.isPlaying]);

  // Stop metronome
  const stop = useCallback(() => {
    if (engineRef.current && state.isPlaying) {
      engineRef.current.stop();
      setState(engineRef.current.getState());
    }
  }, [state.isPlaying]);

  // Toggle play/stop
  const toggle = useCallback(() => {
    if (state.isPlaying) {
      stop();
    } else {
      start();
    }
  }, [state.isPlaying, start, stop]);

  // Set BPM
  const setBPM = useCallback((bpm: number) => {
    if (engineRef.current) {
      engineRef.current.setBPM(bpm);
      setState(engineRef.current.getState());
    }
  }, []);

  // Set subdivisions
  const setSubdivisions = useCallback((subdivisions: number) => {
    if (engineRef.current) {
      engineRef.current.setSubdivisions(subdivisions);
      setState(engineRef.current.getState());
    }
  }, []);

  // Set sound type
  const setSoundType = useCallback((type: SoundType) => {
    if (engineRef.current) {
      engineRef.current.setSoundType(type);
      setState(engineRef.current.getState());
    }
  }, []);

  // Event-based state synchronization for precise beat timing
  useEffect(() => {
    if (!engineRef.current) return;

    // Set up direct event listener on the engine for immediate UI updates
    const syncInterval = setInterval(() => {
      if (engineRef.current) {
        const currentState = engineRef.current.getState();
        setState(prevState => {
          // Only update if beat actually changed to trigger immediate visual feedback
          if (prevState.currentBeat !== currentState.currentBeat || 
              prevState.currentSubdivision !== currentState.currentSubdivision ||
              prevState.isPlaying !== currentState.isPlaying) {
            return currentState;
          }
          return prevState;
        });
      }
    }, 10); // Much faster sync (10ms) for beat-accurate visual timing

    return () => clearInterval(syncInterval);
  }, [isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, []);

  return {
    state,
    isInitialized,
    error,
    actions: {
      initialize,
      start,
      stop,
      toggle,
      setBPM,
      setSubdivisions,
      setSoundType
    }
  };
}