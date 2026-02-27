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
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Tone.js metronome engine
  const initialize = useCallback(async () => {
    if (engineRef.current || isInitialized) return;

    try {
      setError(null);
      console.log('🎯 Initializing Tone.js Metronome Engine...');
      
      const engine = new MetronomeEngine();
      
      // Set up state change listener BEFORE initialization
      engine.onStateChange((newState: MetronomeState) => {
        setState({
          ...newState,
          // Preserve UI-specific state
        });
      });
      
      await engine.initialize();
      
      // Enhanced mobile audio preparation for Tone.js
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        console.log('🎯 Mobile device detected - enhanced audio preparation');
        
        // Extended stabilization for mobile Tone.js
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Test Tone.js specifically on mobile
        try {
          await engine.ensureAudioReady();
          console.log('🎯 Mobile audio ready');
        } catch (mobileError) {
          console.error('Mobile audio preparation failed:', mobileError);
          throw new Error('Mobile audio initialization failed');
        }
      }
      
      engineRef.current = engine;
      setIsInitialized(true);
      setIsPaused(false);
      
      // Sync initial state
      setState(engine.getState());
      
      console.log('🎯 Tone.js Metronome Engine initialized successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Tone.js metronome';
      console.error('🎯 Initialization error:', err);
      setError(errorMessage);
    }
  }, [isInitialized]);

  // Start metronome with Tone.Transport
  const start = useCallback(async () => {
    if (!engineRef.current) {
      await initialize();
    }
    
    if (engineRef.current && !state.isPlaying && !isPaused) {
      try {
        console.log('🎯 Starting Tone.Transport metronome...');
        await engineRef.current.start();
        setIsPaused(false);
        setError(null);
      } catch (error) {
        console.error('🎯 Failed to start metronome:', error);
        setError('Failed to start metronome. Please tap to enable audio first.');
      }
    }
  }, [initialize, state.isPlaying, isPaused]);

  // Pause metronome (Tone.Transport pause maintains position)
  const pause = useCallback(() => {
    if (engineRef.current && state.isPlaying && !isPaused) {
      console.log('🎯 Pausing Tone.Transport metronome...');
      engineRef.current.pause();
      setIsPaused(true);
    }
  }, [state.isPlaying, isPaused]);

  // Resume metronome from pause position
  const resume = useCallback(async () => {
    if (engineRef.current && !state.isPlaying && isPaused) {
      try {
        console.log('🎯 Resuming Tone.Transport metronome...');
        await engineRef.current.resume();
        setIsPaused(false);
        setError(null);
      } catch (error) {
        console.error('🎯 Failed to resume metronome:', error);
        setError('Failed to resume metronome. Please try again.');
      }
    }
  }, [state.isPlaying, isPaused]);

  // Stop metronome (resets to beat 1)
  const stop = useCallback(() => {
    if (engineRef.current && (state.isPlaying || isPaused)) {
      console.log('🎯 Stopping Tone.Transport metronome...');
      engineRef.current.stop();
      setIsPaused(false);
      setError(null);
    }
  }, [state.isPlaying, isPaused]);

  // Smart toggle: play/pause if started, start if stopped
  const toggle = useCallback(async () => {
    if (!state.isPlaying && !isPaused) {
      // Completely stopped - start from beginning
      await start();
    } else if (state.isPlaying && !isPaused) {
      // Playing - pause
      pause();
    } else if (!state.isPlaying && isPaused) {
      // Paused - resume
      await resume();
    }
  }, [state.isPlaying, isPaused, start, pause, resume]);

  // Set BPM with live Tone.Transport update
  const setBPM = useCallback((bpm: number) => {
    if (engineRef.current) {
      console.log(`🎯 Setting BPM to ${bpm} (live update with Tone.Transport)`);
      engineRef.current.setBPM(bpm);
      // State will be updated via the state change callback
    }
  }, []);

  // Set subdivisions with live update
  const setSubdivisions = useCallback((subdivisions: number) => {
    if (engineRef.current) {
      console.log(`🎯 Setting subdivisions to ${subdivisions} (live update)`);
      engineRef.current.setSubdivisions(subdivisions);
      // State will be updated via the state change callback
    }
  }, []);

  // Set beats per measure
  const setBeatsPerMeasure = useCallback((beats: number) => {
    if (engineRef.current) {
      console.log(`🎯 Setting beats per measure to ${beats}`);
      engineRef.current.setBeatsPerMeasure(beats);
      // State will be updated via the state change callback
    }
  }, []);

  // Set sound type
  const setSoundType = useCallback((type: SoundType) => {
    if (engineRef.current) {
      console.log(`🎯 Setting sound type to ${type}`);
      engineRef.current.setSoundType(type);
      // State will be updated via the state change callback
    }
  }, []);

  // Set accent color
  const setAccentColor = useCallback((color: AccentColor) => {
    if (engineRef.current) {
      console.log(`🎯 Setting accent color to ${color}`);
      engineRef.current.setAccentColor(color);
      // State will be updated via the state change callback
    }
  }, []);

  // Set beat level (accent, normal, muted)
  const setBeatLevel = useCallback((beatIndex: number, level: BeatLevel) => {
    if (engineRef.current) {
      console.log(`🎯 Setting beat ${beatIndex + 1} to ${level}`);
      engineRef.current.setBeatLevel(beatIndex, level);
      // State will be updated via the state change callback
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
    
    console.log(`🎯 Cycling beat ${beatIndex + 1} from ${currentLevel} to ${newLevel}`);
    setBeatLevel(beatIndex, newLevel);
  }, [setBeatLevel]);

  // Auto-initialize on mount for better UX
  useEffect(() => {
    // Only auto-initialize on user interaction to respect browser audio policies
    const initOnFirstInteraction = () => {
      if (!isInitialized) {
        initialize().catch(err => {
          console.error('Auto-initialization failed:', err);
        });
      }
      
      // Remove listeners after first successful init
      document.removeEventListener('touchstart', initOnFirstInteraction);
      document.removeEventListener('click', initOnFirstInteraction);
    };

    // Listen for user interactions to enable audio
    document.addEventListener('touchstart', initOnFirstInteraction, { once: true });
    document.addEventListener('click', initOnFirstInteraction, { once: true });

    return () => {
      document.removeEventListener('touchstart', initOnFirstInteraction);
      document.removeEventListener('click', initOnFirstInteraction);
    };
  }, [initialize, isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        console.log('🎯 Cleaning up Tone.js Metronome Engine...');
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  // Enhanced error recovery
  const recoverFromError = useCallback(async () => {
    if (error) {
      console.log('🎯 Attempting error recovery...');
      setError(null);
      
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      
      setIsInitialized(false);
      setIsPaused(false);
      
      // Wait a bit before reinitializing
      setTimeout(() => {
        initialize().catch(err => {
          console.error('Error recovery failed:', err);
          setError('Recovery failed. Please refresh the page.');
        });
      }, 500);
    }
  }, [error, initialize]);

  // Get enhanced audio info for debugging
  const getAudioInfo = useCallback(() => {
    if (engineRef.current && engineRef.current.audioEngine) {
      return engineRef.current.audioEngine.getAudioInfo();
    }
    return null;
  }, []);

  return {
    state: {
      ...state,
      // Add pause state for UI
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
      cycleBeatLevel,
      recoverFromError
    },
    debug: {
      getAudioInfo
    }
  };
}