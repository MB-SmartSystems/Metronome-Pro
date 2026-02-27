import { AudioConfig, AudioBufferPool, SoundLevel, SoundType } from '@/types/metronome';

export class AudioEngine {
  private audioContext: AudioContext;
  private bufferPool: AudioBufferPool | null = null;
  private config: AudioConfig;
  private isWarmedUp = false;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private masterGain: GainNode;
  
  constructor() {
    // Samsung S23 and high-end device optimization
    const isSamsungHighEnd = /Android.*SM-S9\d\d/i.test(navigator.userAgent);
    const isHighEndDevice = /Android.*SM-S|iPhone1[3-9]|iPhone[2-9]/i.test(navigator.userAgent);
    
    this.config = {
      sampleRate: 44100,
      bufferSize: isSamsungHighEnd ? 128 : (isHighEndDevice ? 256 : 512),
      lookaheadTime: isSamsungHighEnd ? 0.010 : (isHighEndDevice ? 0.012 : 0.015),
      scheduleInterval: isSamsungHighEnd ? 0.006 : (isHighEndDevice ? 0.008 : 0.010)
    };
    
    // Create AudioContext with optimal settings
    this.audioContext = new AudioContext({
      sampleRate: this.config.sampleRate,
      latencyHint: 'interactive', // Critical for low latency
    });

    // Create master gain node for volume control and cleanup
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.audioContext.destination);
  }

  async initialize(): Promise<void> {
    // Force AudioContext to ready state
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Create audio buffer pool
    this.bufferPool = await this.createAudioBuffers();
    
    // CRITICAL: Warm up audio pipeline
    await this.warmUpAudioPipeline();
    
    this.isWarmedUp = true;
  }

  private async warmUpAudioPipeline(): Promise<void> {
    if (!this.bufferPool) return;
    
    try {
      // Play multiple silent sounds to prime the entire audio pipeline
      const silentBuffer = this.createSilentBuffer(0.001);
      
      for (let i = 0; i < 5; i++) {
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = silentBuffer;
        gainNode.gain.value = 0; // Silent
        
        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const startTime = this.audioContext.currentTime + (i * 0.005); // 5ms apart
        source.start(startTime);
        
        // Auto cleanup
        source.onended = () => {
          try {
            gainNode.disconnect();
          } catch (e) {
            // Already disconnected
          }
        };
        
        if (i < 4) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }
      
      // Wait for warm-up completion
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Audio pipeline warm-up failed:', error);
    }
  }

  private createSilentBuffer(duration: number): AudioBuffer {
    const frameCount = duration * this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, frameCount, this.audioContext.sampleRate);
    // Buffer is already silent (zeros)
    return buffer;
  }

  private async createAudioBuffers(): Promise<AudioBufferPool> {
    const duration = 0.08; // 80ms buffers - shorter for cleaner sound
    const sampleRate = this.audioContext.sampleRate;
    const frameCount = duration * sampleRate;

    return {
      accent: this.createClickBuffer(frameCount, 1000, 0.9), // 1000Hz, loud and clear
      normal: this.createClickBuffer(frameCount, 800, 0.7),  // 800Hz, normal volume  
      subdivision: this.createClickBuffer(frameCount, 600, 0.4) // 600Hz, softer
    };
  }

  private createClickBuffer(frameCount: number, frequency: number, gain: number): AudioBuffer {
    const buffer = this.audioContext.createBuffer(1, frameCount, this.audioContext.sampleRate);
    const channelData = buffer.getChannelData(0);
    
    const attackTime = 0.001; // 1ms sharp attack
    const decayTime = 0.04;   // 40ms decay
    const attackSamples = attackTime * this.audioContext.sampleRate;
    const decayEnd = decayTime * this.audioContext.sampleRate;
    
    for (let i = 0; i < frameCount; i++) {
      const t = i / this.audioContext.sampleRate;
      let amplitude = gain;
      
      // Sharp envelope for precise click
      if (i < attackSamples) {
        amplitude *= i / attackSamples; // Linear attack
      } else if (i < decayEnd) {
        const decayProgress = (i - attackSamples) / (decayEnd - attackSamples);
        amplitude *= Math.exp(-decayProgress * 6); // Fast exponential decay
      } else {
        amplitude = 0;
      }
      
      // Clean sine wave with minimal harmonics
      channelData[i] = amplitude * (
        Math.sin(2 * Math.PI * frequency * t) + 
        0.05 * Math.sin(2 * Math.PI * frequency * 2 * t) // Very subtle 2nd harmonic
      );
    }
    
    return buffer;
  }

  playSound(level: SoundLevel, time: number): AudioBufferSourceNode | null {
    if (!this.bufferPool || !this.isWarmedUp) return null;
    
    const currentTime = this.audioContext.currentTime;
    const scheduleTime = Math.max(time, currentTime);
    
    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.bufferPool[level];
      
      // Individual gain control for each source
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 1.0;
      
      // Connect: source -> gain -> master -> destination
      source.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      // Track active source for cleanup
      this.activeSources.add(source);
      
      // Auto-cleanup when source ends
      source.onended = () => {
        this.activeSources.delete(source);
        try {
          gainNode.disconnect();
        } catch (e) {
          // Already disconnected
        }
      };
      
      // Start playback
      source.start(scheduleTime);
      
      return source;
      
    } catch (error) {
      console.error('Audio playback error:', error);
      return null;
    }
  }

  // CRITICAL: Immediately stop all audio sources
  stopAllSounds(): void {
    const sources = Array.from(this.activeSources);
    this.activeSources.clear();
    
    sources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Source may already be stopped/disconnected
      }
    });
    
    // Additional cleanup - disconnect and reconnect master gain
    try {
      this.masterGain.disconnect();
      this.masterGain.connect(this.audioContext.destination);
    } catch (e) {
      // Handle reconnection errors
      console.error('Master gain reconnection error:', e);
    }
  }

  getCurrentTime(): number {
    return this.audioContext.currentTime;
  }

  async ensureAudioReady(): Promise<boolean> {
    try {
      // Resume if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Test on mobile devices
      if (/Android|iOS/i.test(navigator.userAgent)) {
        // Quick test to ensure audio pipeline is responsive
        const testBuffer = this.createSilentBuffer(0.001);
        const testSource = this.audioContext.createBufferSource();
        const testGain = this.audioContext.createGain();
        
        testSource.buffer = testBuffer;
        testGain.gain.value = 0;
        
        testSource.connect(testGain);
        testGain.connect(this.masterGain);
        
        const testTime = this.audioContext.currentTime;
        testSource.start(testTime);
        testSource.stop(testTime + 0.001);
        
        // Small stabilization delay for mobile
        await new Promise(resolve => setTimeout(resolve, 20));
        
        // Cleanup
        try {
          testGain.disconnect();
        } catch (e) {
          // Already disconnected
        }
      }
      
      const isReady = this.audioContext.state === 'running' && this.isWarmedUp;
      
      if (!isReady) {
        console.error('Audio not ready:', {
          state: this.audioContext.state,
          warmedUp: this.isWarmedUp
        });
      }
      
      return isReady;
    } catch (error) {
      console.error('Audio readiness check failed:', error);
      return false;
    }
  }

  getAudioInfo(): object {
    return {
      state: this.audioContext.state,
      sampleRate: this.audioContext.sampleRate,
      baseLatency: this.audioContext.baseLatency || 'unknown',
      outputLatency: this.audioContext.outputLatency || 'unknown',
      currentTime: this.audioContext.currentTime,
      isWarmedUp: this.isWarmedUp,
      activeSources: this.activeSources.size,
      userAgent: navigator.userAgent,
      config: this.config
    };
  }

  destroy(): void {
    // Stop all active sources
    this.stopAllSounds();
    
    // Disconnect master gain
    try {
      this.masterGain.disconnect();
    } catch (e) {
      // Already disconnected
    }
    
    // Close audio context
    this.isWarmedUp = false;
    
    // Close asynchronously to avoid blocking
    this.audioContext.close().then(() => {
      // Audio context closed successfully
    }).catch(error => {
      console.error('Audio context close error:', error);
    });
  }
}