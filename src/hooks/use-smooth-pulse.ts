'use client';

import { useEffect, useRef, useState } from 'react';

interface UseSmoothPulseOptions {
  isActive: boolean;
  duration?: number; // Duration in milliseconds
  maxOpacity?: number;
  minOpacity?: number;
}

/**
 * Custom hook for smooth 60fps pulse animation using requestAnimationFrame
 * Replaces CSS animate-pulse for better performance and smoothness
 */
export function useSmoothPulse({
  isActive,
  duration = 600,
  maxOpacity = 1,
  minOpacity = 0.4,
}: UseSmoothPulseOptions) {
  const [opacity, setOpacity] = useState(maxOpacity);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const isIncreasingRef = useRef(true);

  useEffect(() => {
    if (!isActive) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setOpacity(maxOpacity);
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = (elapsed % duration) / duration;

      let currentProgress: number;
      if (progress <= 0.5) {
        // First half: fade out
        currentProgress = progress * 2;
        isIncreasingRef.current = false;
      } else {
        // Second half: fade in
        currentProgress = (1 - progress) * 2;
        isIncreasingRef.current = true;
      }

      // Smooth easing function (ease-in-out)
      const eased = currentProgress < 0.5 
        ? 2 * currentProgress * currentProgress
        : 1 - Math.pow(-2 * currentProgress + 2, 2) / 2;

      const newOpacity = minOpacity + (maxOpacity - minOpacity) * (1 - eased);
      setOpacity(newOpacity);

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
  }, [isActive, duration, maxOpacity, minOpacity]);

  return opacity;
}