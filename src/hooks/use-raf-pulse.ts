'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseRAFPulseOptions {
  isActive: boolean;
  bpm: number;
  currentBeat: number;
  maxOpacity?: number;
  minOpacity?: number;
  pulseIntensity?: number;
}

/**
 * Professional RAF-based pulse animation synchronized with Tone.Transport
 * Provides perfect 60fps visual sync with audio timing
 * Replaces all CSS animations for pixel-perfect control
 */
export function useRAFPulse({
  isActive,
  bpm,
  currentBeat,
  maxOpacity = 1,
  minOpacity = 0.4,
  pulseIntensity = 0.8
}: UseRAFPulseOptions) {
  const [opacity, setOpacity] = useState(maxOpacity);
  const [scale, setScale] = useState(1);
  const [glow, setGlow] = useState(0);
  
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const lastBeatRef = useRef<number>(currentBeat);
  const beatStartTimeRef = useRef<number>(0);

  // Calculate beat duration in milliseconds
  const beatDuration = useCallback(() => {
    return (60 / bpm) * 1000; // Convert BPM to ms per beat
  }, [bpm]);

  // Reset animation when beat changes
  useEffect(() => {
    if (currentBeat !== lastBeatRef.current && isActive) {
      lastBeatRef.current = currentBeat;
      beatStartTimeRef.current = performance.now();
      startTimeRef.current = undefined; // Force restart
    }
  }, [currentBeat, isActive]);

  useEffect(() => {
    if (!isActive) {
      // Stop animation and reset to default state
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      
      setOpacity(maxOpacity);
      setScale(1);
      setGlow(0);
      startTimeRef.current = undefined;
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
        beatStartTimeRef.current = timestamp;
      }

      // Calculate progress within current beat (0 to 1)
      const timeSinceBeatStart = timestamp - beatStartTimeRef.current;
      const beatProgress = Math.min(timeSinceBeatStart / beatDuration(), 1);

      // CRITICAL: Professional animation curve for immediate visual feedback
      let opacity: number;
      let scale: number;
      let glow: number;

      if (beatProgress <= 0.05) {
        // First 5%: Immediate maximum impact (0-50ms at 120 BPM)
        opacity = maxOpacity;
        scale = 1.15;
        glow = pulseIntensity;
      } else if (beatProgress <= 0.15) {
        // Next 10%: Quick scale-down while maintaining brightness
        const localProgress = (beatProgress - 0.05) / 0.1;
        opacity = maxOpacity;
        scale = 1.15 - (0.1 * localProgress); // Scale down to 1.05
        glow = pulseIntensity * (1 - localProgress * 0.3); // Reduce to 70%
      } else if (beatProgress <= 0.4) {
        // Next 25%: Gradual fade with slight scale
        const localProgress = (beatProgress - 0.15) / 0.25;
        const fadeEase = 1 - Math.pow(localProgress, 1.5); // Power curve for smooth fade
        
        opacity = minOpacity + (maxOpacity - minOpacity) * fadeEase;
        scale = 1.05 - (0.03 * localProgress); // Scale down to 1.02
        glow = pulseIntensity * 0.7 * fadeEase;
      } else if (beatProgress <= 0.8) {
        // Next 40%: Gentle breathe effect
        const localProgress = (beatProgress - 0.4) / 0.4;
        const breathe = 0.5 + 0.5 * Math.sin(localProgress * Math.PI * 2); // Sine wave breathing
        
        opacity = minOpacity + (maxOpacity - minOpacity) * breathe * 0.2;
        scale = 1.02 + (0.01 * breathe); // Subtle breathing scale
        glow = pulseIntensity * 0.3 * breathe;
      } else {
        // Final 20%: Prepare for next beat
        const localProgress = (beatProgress - 0.8) / 0.2;
        const rampUp = localProgress * 0.3; // Gentle ramp up
        
        opacity = minOpacity + rampUp * (maxOpacity - minOpacity);
        scale = 1.02 + (0.02 * rampUp);
        glow = pulseIntensity * 0.2 * rampUp;
      }

      // Apply calculated values
      setOpacity(opacity);
      setScale(scale);
      setGlow(glow);

      // Continue animation if still active
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
  }, [isActive, bpm, maxOpacity, minOpacity, pulseIntensity, beatDuration]);

  return {
    opacity,
    scale,
    glow,
    // Additional properties for advanced styling
    transform: `scale(${scale})`,
    boxShadow: glow > 0 ? `0 0 ${Math.round(glow * 20)}px rgba(255, 255, 255, ${glow})` : 'none',
    filter: glow > 0.3 ? `brightness(${1 + glow * 0.2})` : 'none'
  };
}

/**
 * RAF-based subdivision indicator animation
 * Synchronized with main beat pulse for perfect timing
 */
export function useRAFSubdivisionPulse({
  isActive,
  bpm,
  subdivisions,
  currentSubdivision,
  maxOpacity = 0.8,
  minOpacity = 0.2
}: {
  isActive: boolean;
  bpm: number;
  subdivisions: number;
  currentSubdivision: number;
  maxOpacity?: number;
  minOpacity?: number;
}) {
  const [opacity, setOpacity] = useState(minOpacity);
  const animationFrameRef = useRef<number>();
  const lastSubdivisionRef = useRef<number>(currentSubdivision);
  const subdivisionStartTimeRef = useRef<number>(0);

  // Calculate subdivision duration
  const subdivisionDuration = useCallback(() => {
    return (60 / bpm / subdivisions) * 1000;
  }, [bpm, subdivisions]);

  // Reset animation when subdivision changes
  useEffect(() => {
    if (currentSubdivision !== lastSubdivisionRef.current && isActive) {
      lastSubdivisionRef.current = currentSubdivision;
      subdivisionStartTimeRef.current = performance.now();
    }
  }, [currentSubdivision, isActive]);

  useEffect(() => {
    if (!isActive) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setOpacity(minOpacity);
      return;
    }

    const animate = (timestamp: number) => {
      const timeSinceSubdivision = timestamp - subdivisionStartTimeRef.current;
      const subdivisionProgress = Math.min(timeSinceSubdivision / subdivisionDuration(), 1);

      // Quick flash animation for subdivision indicators
      let opacity: number;
      
      if (subdivisionProgress <= 0.1) {
        // First 10%: Quick flash
        opacity = maxOpacity;
      } else if (subdivisionProgress <= 0.3) {
        // Next 20%: Fast fade
        const fadeProgress = (subdivisionProgress - 0.1) / 0.2;
        opacity = maxOpacity * (1 - fadeProgress);
      } else {
        // Remaining time: Stay at minimum
        opacity = minOpacity;
      }

      setOpacity(opacity);

      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, bpm, subdivisions, maxOpacity, minOpacity, subdivisionDuration]);

  return { opacity };
}