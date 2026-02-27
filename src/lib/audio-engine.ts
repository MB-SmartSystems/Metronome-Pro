import { AudioConfig, AudioBufferPool, SoundLevel, SoundType } from '@/types/metronome';

export class AudioEngine {
  private audioContext: AudioContext;
  private bufferPool: AudioBufferPool | null = null;
  private config: AudioConfig;
  private isWarmedUp = false;
  
  constructor() {
    // Samsung S23 optimization - detect and adjust for high-end Android devices
    const isSamsungHighEnd = /Android.*SM-S9\d\d/i.test(navigator.userAgent);
    
    this.config = {
      sampleRate: 44100,
      bufferSize: isSamsungHighEnd ? 128 : 256, // Smaller buffer for Samsung S23+
      lookaheadTime: isSamsungHighEnd ? 0.012 : 0.015, // Tighter timing for high-end devices
      scheduleInterval: isSamsungHighEnd ? 0.008 : 0.010 // More aggressive scheduling for Samsung
    };
    
    // Create AudioContext with optimal settings for mobile
    this.audioContext = new AudioContext({
      sampleRate: this.config.sampleRate,
      latencyHint: 'interactive', // Changed from 'playback' to 'interactive' for lower latency
    });
  }

  async initialize(): Promise<void> {
    // Force AudioContext to ready state
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Create audio buffer pool
    this.bufferPool = await this.createAudioBuffers();
    
    // CRITICAL: Warm up audio pipeline with silent playback
    await this.warmUpAudioPipeline();
    
    this.isWarmedUp = true;
  }

  private async warmUpAudioPipeline(): Promise<void> {
    if (!this.bufferPool) return;
    
    // Play silent sound to initialize audio pipeline
    // This primes the entire audio system for immediate response
    const silentBuffer = this.createSilentBuffer(0.001); // 1ms silent
    
    try {
      // Play multiple silent sounds to fully warm up the pipeline
      for (let i = 0; i < 3; i++) {
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = silentBuffer;
        gainNode.gain.value = 0; // Silent
        
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        const startTime = this.audioContext.currentTime + (i * 0.01);
        source.start(startTime);
        
        // Wait a bit between warm-up sounds
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Wait for warm-up to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.warn('Audio pipeline warm-up failed:', error);
    }
  }

  private createSilentBuffer(duration: number): AudioBuffer {
    const frameCount = duration * this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, frameCount, this.audioContext.sampleRate);
    // Buffer is already silent (zeros), no need to fill
    return buffer;
  }

  private async createAudioBuffers(): Promise<AudioBufferPool> {
    const duration = 0.1; // 100ms buffers
    const sampleRate = this.audioContext.sampleRate;
    const frameCount = duration * sampleRate;

    return {
      accent: this.createClickBuffer(frameCount, 1000, 0.8), // 1000Hz, loud
      normal: this.createClickBuffer(frameCount, 800, 0.6),  // 800Hz, normal  
      subdivision: this.createClickBuffer(frameCount, 600, 0.4) // 600Hz, soft
    };
  }

  private createClickBuffer(frameCount: number, frequency: number, gain: number): AudioBuffer {
    const buffer = this.audioContext.createBuffer(1, frameCount, this.audioContext.sampleRate);
    const channelData = buffer.getChannelData(0);
    
    const attackTime = 0.001; // 1ms attack
    const decayTime = 0.05;   // 50ms decay
    const attackSamples = attackTime * this.audioContext.sampleRate;
    const decayStart = attackSamples;
    const decayEnd = decayTime * this.audioContext.sampleRate;
    
    for (let i = 0; i < frameCount; i++) {
      const t = i / this.audioContext.sampleRate;
      let amplitude = gain;
      
      // Envelope (sharp attack, exponential decay)
      if (i < attackSamples) {
        amplitude *= i / attackSamples; // Linear attack
      } else if (i < decayEnd) {
        const decayProgress = (i - decayStart) / (decayEnd - decayStart);
        amplitude *= Math.exp(-decayProgress * 5); // Exponential decay
      } else {
        amplitude = 0;
      }
      
      // Generate sine wave with slight harmonics for click character
      channelData[i] = amplitude * (
        Math.sin(2 * Math.PI * frequency * t) + 
        0.1 * Math.sin(2 * Math.PI * frequency * 2 * t) // 2nd harmonic
      );
    }
    
    return buffer;
  }

  private createClaveBuffer(frameCount: number, gain: number): AudioBuffer {
    const buffer = this.audioContext.createBuffer(1, frameCount, this.audioContext.sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Simulate wood block hit with multiple frequencies
    const fundamentals = [400, 800, 1200, 1600]; // Wood resonance frequencies
    const attackTime = 0.002; // 2ms attack
    const decayTime = 0.08;   // 80ms decay
    
    for (let i = 0; i < frameCount; i++) {
      const t = i / this.audioContext.sampleRate;
      let sample = 0;
      
      // Envelope
      let amplitude = gain;
      if (t < attackTime) {
        amplitude *= t / attackTime;
      } else {
        amplitude *= Math.exp(-(t - attackTime) / 0.03); // Fast decay
      }
      
      // Mix multiple frequencies for wood character
      for (let j = 0; j < fundamentals.length; j++) {
        const freq = fundamentals[j];
        const harmonic_gain = 1 / (j + 1); // Decreasing harmonics
        sample += harmonic_gain * Math.sin(2 * Math.PI * freq * t);
      }
      
      channelData[i] = amplitude * sample * 0.25; // Scale down mixed signal
    }
    
    return buffer;
  }

  playSound(level: SoundLevel, time: number): void {
    if (!this.bufferPool || !this.isWarmedUp) return;
    
    const currentTime = this.audioContext.currentTime;
    
    // Ensure we don't schedule sounds in the past
    const scheduleTime = Math.max(time, currentTime);
    
    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.bufferPool[level];
      
      // Create gain node for mobile audio optimization
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 1.0;
      
      // Connect: source -> gain -> destination
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Start playback
      source.start(scheduleTime);
      
      // Mobile-specific: Ensure the source is cleaned up
      source.onended = () => {
        try {
          gainNode.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      };
      
    } catch (error) {
      console.warn('Audio playback error:', error);
      
      // Fallback: Try to play immediately if scheduling failed
      try {
        const fallbackSource = this.audioContext.createBufferSource();
        fallbackSource.buffer = this.bufferPool[level];
        fallbackSource.connect(this.audioContext.destination);
        fallbackSource.start(currentTime);
      } catch (fallbackError) {
        console.error('Fallback audio playback also failed:', fallbackError);
      }
    }
  }

  getCurrentTime(): number {
    return this.audioContext.currentTime;
  }

  // Mobile-specific method to handle audio focus and policies
  async ensureAudioReady(): Promise<boolean> {
    try {
      // Ensure audio context is running
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // For mobile devices, test immediate audio responsiveness
      if (/Android|iOS/i.test(navigator.userAgent)) {
        const testTime = this.audioContext.currentTime;
        
        // Quick audio pipeline test
        const testSource = this.audioContext.createOscillator();
        const testGain = this.audioContext.createGain();
        
        testGain.gain.value = 0; // Silent test
        testSource.connect(testGain);
        testGain.connect(this.audioContext.destination);
        
        testSource.frequency.value = 440;
        testSource.start(testTime);
        testSource.stop(testTime + 0.001);
        
        // Small delay for mobile audio to stabilize
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      return this.audioContext.state === 'running' && this.isWarmedUp;
    } catch (error) {
      console.error('Audio readiness check failed:', error);
      return false;
    }
  }

  // Method to get audio system health info for debugging
  getAudioInfo(): object {
    return {
      state: this.audioContext.state,
      sampleRate: this.audioContext.sampleRate,
      baseLatency: this.audioContext.baseLatency,
      outputLatency: this.audioContext.outputLatency,
      currentTime: this.audioContext.currentTime,
      isWarmedUp: this.isWarmedUp,
      userAgent: navigator.userAgent
    };
  }

  destroy(): void {
    this.isWarmedUp = false;
    this.audioContext.close();
  }
}