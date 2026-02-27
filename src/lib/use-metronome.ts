'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MetronomeEngine } from './metronome-engine';
import { MetronomeState, SoundType, BeatLevel, AccentColor } from '@/types/metronome';

export function useMetronome() {
  const engineRef = useRef<MetronomeEngine | null>(null);
  const [state, setState] = useState<MetronomeState>({
    isPlaying: false,
    bpm: 120,
    subdivisions: 1,
    beatsPerMeasure: 4,
    currentBeat: 1, // CRITICAL: Always starts at 1
    currentSubdivision: 1,
    soundType: 'click',
    accentColor: 'red',
    beatPattern: ['accent', 'normal', 'normal', 'normal']
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize metronome engine
  const initialize = useCallback(async () => {
    if (engineRef.current || isInitialized) return;

    try {
      setError(null);
      // Initializing metronome engine
      
      const engine = new MetronomeEngine();
      await engine.initialize();
      
      // Mobile-specific audio preparation
      if (/Android/i.test(navigator.userAgent)) {
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Test audio capability
        try {
          const testContext = new AudioContext();
          if (testContext.state === 'suspended') {
            await testContext.resume();
          }
          await testContext.close();
        } catch (testError) {
          console.error('Mobile audio test failed:', testError);
        }
      }
      
      engineRef.current = engine;
      setIsInitialized(true);
      setIsPaused(false);
      
      // Sync initial state
      setState(engine.getState());
      
      // Metronome initialized successfully
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize metronome';
      console.error('Initialization error:', err);
      setError(errorMessage);
    }
  }, [isInitialized]);

  // Start metronome (always from beat 1)
  const start = useCallback(async () => {
    if (!engineRef.current) {
      await initialize();
    }
    
    if (engineRef.current && !state.isPlaying) {
      try {
        await engineRef.current.start();
        setState(engineRef.current.getState());
        setIsPaused(false);
      } catch (error) {
        console.error('Failed to start metronome:', error);
        setError('Failed to start metronome. Please try again.');
      }
    }
  }, [initialize, state.isPlaying]);

  // Pause metronome (maintains position)
  const pause = useCallback(() => {
    if (engineRef.current && state.isPlaying && !isPaused) {
      engineRef.current.pause();
      setIsPaused(true);
      
      // Update state to show paused but maintain position
      const currentState = engineRef.current.getState();
      setState({
        ...currentState,
        isPlaying: false // UI shows paused state
      });
    }
  }, [state.isPlaying, isPaused]);

  // Resume metronome (from current position)
  const resume = useCallback(async () => {
    if (engineRef.current && !state.isPlaying && isPaused) {
      try {
        await engineRef.current.resume();
        setState(engineRef.current.getState());
        setIsPaused(false);
      } catch (error) {
        console.error('Failed to resume metronome:', error);
        setError('Failed to resume metronome. Please try again.');
      }
    }
  }, [state.isPlaying, isPaused]);

  // Stop metronome (resets to beat 1)
  const stop = useCallback(() => {
    if (engineRef.current && (state.isPlaying || isPaused)) {
      engineRef.current.stop();
      setState(engineRef.current.getState());
      setIsPaused(false);
    }
  }, [state.isPlaying, isPaused]);

  // Smart toggle: play/pause if started, start if stopped
  const toggle = useCallback(() => {
    if (!state.isPlaying && !isPaused) {
      // Completely stopped - start from beginning
      start();
    } else if (state.isPlaying && !isPaused) {
      // Playing - pause
      pause();
    } else if (!state.isPlaying && isPaused) {
      // Paused - resume
      resume();
    }
  }, [state.isPlaying, isPaused, start, pause, resume]);

  // Set BPM with live update support
  const setBPM = useCallback((bpm: number) => {
    if (engineRef.current) {
      engineRef.current.setBPM(bpm);
      setState(engineRef.current.getState());
      
      // No need to restart - live updates work!
    }
  }, [state.isPlaying]);

  // Set subdivisions with live update support
  const setSubdivisions = useCallback((subdivisions: number) => {
    if (engineRef.current) {
      engineRef.current.setSubdivisions(subdivisions);
      setState(engineRef.current.getState());
      
      // No need to restart - live updates work!
    }
  }, [state.isPlaying]);

  // Set beats per measure
  const setBeatsPerMeasure = useCallback((beats: number) => {
    if (engineRef.current) {
      engineRef.current.setBeatsPerMeasure(beats);
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

  // Set accent color
  const setAccentColor = useCallback((color: AccentColor) => {
    if (engineRef.current) {
      engineRef.current.setAccentColor(color);
      setState(engineRef.current.getState());
    }
  }, []);

  // Set beat level (accent, normal, muted)
  const setBeatLevel = useCallback((beatIndex: number, level: BeatLevel) => {
    if (engineRef.current) {
      engineRef.current.setBeatLevel(beatIndex, level);
      setState(engineRef.current.getState());
    }
  }, []);

  // Cycle beat level (normal → accent → muted → normal)
  const cycleBeatLevel = useCallback((beatIndex: number) => {
    if (!engineRef.current) return;
    
    const currentState = engineRef.current.getState();
    const currentLevel = currentState.beatPattern[beatIndex] || 'normal';
    
    let newLevel: BeatLevel;
    switch (currentLevel) {
      case 'normal':
        newLevel = 'accent';
        break;
      case 'accent':
        newLevel = 'muted';
        break;
      case 'muted':
        newLevel = 'normal';
        break;
      default:
        newLevel = 'normal';
    }
    
    setBeatLevel(beatIndex, newLevel);
  }, [setBeatLevel]);

  // High-frequency state synchronization for accurate beat display
  useEffect(() => {
    if (!engineRef.current || !isInitialized) return;

    const syncInterval = setInterval(() => {
      if (engineRef.current) {
        const currentState = engineRef.current.getState();
        
        setState(prevState => {
          // Only update if something actually changed
          const stateChanged = 
            prevState.currentBeat !== currentState.currentBeat || 
            prevState.currentSubdivision !== currentState.currentSubdivision ||
            prevState.isPlaying !== currentState.isPlaying ||
            prevState.bpm !== currentState.bpm ||
            prevState.subdivisions !== currentState.subdivisions;
          
          if (stateChanged) {
            return {
              ...currentState,
              // Override playing state if paused
              isPlaying: isPaused ? false : currentState.isPlaying
            };
          }
          
          return prevState;
        });
      }
    }, 8); // 8ms sync for beat-accurate visuals (125 FPS)

    return () => clearInterval(syncInterval);
  }, [isInitialized, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  return {
    state: {
      ...state,
      // Expose pause state for UI
      isPaused
    },
    isInitialized,
    error,
    actions: {
      initialize,
      start,
      pause,
      resume,
      stop,
      toggle,
      setBPM,
      setSubdivisions,
      setBeatsPerMeasure,
      setSoundType,
      setAccentColor,
      setBeatLevel,
      cycleBeatLevel
    }
  };
}