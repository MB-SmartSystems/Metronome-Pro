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
    currentBeat: 1,
    currentSubdivision: 1,
    soundType: 'click',
    accentColor: 'red',
    beatPattern: ['accent', 'normal', 'normal', 'normal']
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize metronome engine
  const initialize = useCallback(async () => {
    if (engineRef.current || isInitialized) return;

    try {
      setError(null); // Clear any previous errors
      
      const engine = new MetronomeEngine();
      
      // Initialize with mobile-specific handling
      await engine.initialize();
      
      // Additional mobile audio preparation
      if (/Android/i.test(navigator.userAgent)) {
        // Give mobile audio system extra time to fully initialize
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Test audio capability with silent playback
        try {
          const testAudioContext = new AudioContext();
          if (testAudioContext.state === 'suspended') {
            await testAudioContext.resume();
          }
          await testAudioContext.close();
        } catch (testError) {
          console.warn('Mobile audio test failed:', testError);
        }
      }
      
      engineRef.current = engine;
      setIsInitialized(true);
      
      // Sync initial state
      setState(engine.getState());
      
      console.log('Metronome initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize metronome';
      console.error('Initialization error:', err);
      setError(errorMessage);
    }
  }, [isInitialized]);

  // Start metronome
  const start = useCallback(async () => {
    if (!engineRef.current) {
      await initialize();
    }
    
    if (engineRef.current && !state.isPlaying) {
      // CRITICAL: Ensure audio system is fully ready before starting
      // This prevents the 3-4 beat delay on first start
      try {
        // Force audio context to be fully active
        const audioContext = (engineRef.current as any).audioEngine?.audioContext;
        if (audioContext && audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        // Small delay to ensure mobile audio system is ready
        // This is especially important on Samsung devices
        if (/Android/i.test(navigator.userAgent)) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await engineRef.current.start();
        setState(engineRef.current.getState());
      } catch (error) {
        console.error('Failed to start metronome:', error);
        setError('Failed to start metronome. Please try again.');
      }
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

  // Enhanced state synchronization for beat-accurate timing
  useEffect(() => {
    if (!engineRef.current) return;

    const syncInterval = setInterval(() => {
      if (engineRef.current) {
        const currentState = engineRef.current.getState();
        setState(prevState => {
          // Update if beat or subdivision changed for immediate visual feedback
          if (prevState.currentBeat !== currentState.currentBeat || 
              prevState.currentSubdivision !== currentState.currentSubdivision ||
              prevState.isPlaying !== currentState.isPlaying) {
            return currentState;
          }
          return prevState;
        });
      }
    }, 5); // Very fast sync (5ms) for beat-accurate visuals

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
      setBeatsPerMeasure,
      setSoundType,
      setAccentColor,
      setBeatLevel,
      cycleBeatLevel
    }
  };
}