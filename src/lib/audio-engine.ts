import { AudioConfig, AudioBufferPool, SoundLevel } from '@/types/metronome';

export class AudioEngine {
  private audioContext: AudioContext;
  private bufferPool: AudioBufferPool | null = null;
  private config: AudioConfig;
  private isWarmedUp = false;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private masterGain: GainNode;
  private retryCount = 0;
  private maxRetries = 5;
  private retryDelay = 100; // Start with 100ms
  
  constructor() {
    // Device-specific optimizations
    const isSamsungHighEnd = /Android.*SM-S9\d\d/i.test(navigator.userAgent);
    const isHighEndDevice = /Android.*SM-S|iPhone1[3-9]|iPhone[2-9]/i.test(navigator.userAgent);
    
    // Chrome 119+ optimization detection
    const isAndroidChrome119Plus = this.detectChromeVersion() >= 119 && /Android/i.test(navigator.userAgent);
    const isChromeLatest = isAndroidChrome119Plus && this.detectChromeVersion() >= 125;
    
    this.config = {
      sampleRate: 44100,
      bufferSize: this.getOptimalBufferSize(isSamsungHighEnd, isHighEndDevice, isAndroidChrome119Plus),
      lookaheadTime: this.getOptimalLookahead(isSamsungHighEnd, isHighEndDevice, isAndroidChrome119Plus),
      scheduleInterval: this.getOptimalScheduleInterval(isSamsungHighEnd, isHighEndDevice, isAndroidChrome119Plus)
    };
    
    // Create AudioContext with enhanced settings for Chrome 119+
    const contextOptions: AudioContextOptions = {
      sampleRate: this.config.sampleRate,
      latencyHint: isAndroidChrome119Plus ? 'playback' : 'interactive', // Chrome 119+ optimizes playback hint better
    };
    
    // Chrome 125+ supports additional optimization hints
    if (isChromeLatest && 'AudioContext' in window) {
      // Enable advanced Chrome features when available
      try {
        this.audioContext = new AudioContext({
          ...contextOptions,
          // @ts-expect-error - Future Chrome features not in types yet
          renderQuantumSize: 32, // Smaller quantum for Chrome 125+
          latencyHint: 'balanced',
        });
      } catch {
        // Fallback to standard options
        this.audioContext = new AudioContext(contextOptions);
      }
    } else {
      this.audioContext = new AudioContext(contextOptions);
    }

    // Create master gain node for volume control and cleanup
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.audioContext.destination);
  }

  private detectChromeVersion(): number {
    const match = navigator.userAgent.match(/Chrome\/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private getOptimalBufferSize(isSamsungHighEnd: boolean, isHighEndDevice: boolean, isChrome119Plus: boolean): number {
    if (isChrome119Plus) {
      // Chrome 119+ has optimized audio processing pipeline
      return isSamsungHighEnd ? 64 : (isHighEndDevice ? 128 : 256);
    }
    return isSamsungHighEnd ? 128 : (isHighEndDevice ? 256 : 512);
  }

  private getOptimalLookahead(isSamsungHighEnd: boolean, isHighEndDevice: boolean, isChrome119Plus: boolean): number {
    if (isChrome119Plus) {
      // Chrome 119+ has better scheduling precision
      return isSamsungHighEnd ? 0.008 : (isHighEndDevice ? 0.010 : 0.012);
    }
    return isSamsungHighEnd ? 0.010 : (isHighEndDevice ? 0.012 : 0.015);
  }

  private getOptimalScheduleInterval(isSamsungHighEnd: boolean, isHighEndDevice: boolean, isChrome119Plus: boolean): number {
    if (isChrome119Plus) {
      // Chrome 119+ can handle tighter scheduling
      return isSamsungHighEnd ? 0.004 : (isHighEndDevice ? 0.005 : 0.006);
    }
    return isSamsungHighEnd ? 0.006 : (isHighEndDevice ? 0.008 : 0.010);
  }

  async initialize(): Promise<void> {
    return this.initializeWithRetry();
  }

  private async initializeWithRetry(): Promise<void> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Force AudioContext to ready state
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        
        // Create audio buffer pool
        this.bufferPool = await this.createAudioBuffers();
        
        // CRITICAL: Warm up audio pipeline
        await this.warmUpAudioPipeline();
        
        this.isWarmedUp = true;
        this.retryCount = 0; // Reset on success
        return;
        
      } catch (error) {
        console.warn(`Audio initialization attempt ${attempt + 1} failed:`, error);
        
        if (attempt === this.maxRetries) {
          throw new Error(`Audio initialization failed after ${this.maxRetries + 1} attempts: ${error}`);
        }
        
        // Exponential backoff with jitter
        const delay = this.retryDelay * Math.pow(2, attempt) + Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Try to recreate AudioContext if necessary
        if (this.audioContext.state === 'closed') {
          this.audioContext = new AudioContext({
            sampleRate: this.config.sampleRate,
            latencyHint: 'interactive',
          });
          
          // Recreate master gain
          this.masterGain = this.audioContext.createGain();
          this.masterGain.gain.value = 1.0;
          this.masterGain.connect(this.audioContext.destination);
        }
      }
    }
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
          } catch (_e) {
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
        } catch (_e) {
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
      } catch (_e) {
        // Source may already be stopped/disconnected
      }
    });
    
    // Additional cleanup - disconnect and reconnect master gain
    try {
      this.masterGain.disconnect();
      this.masterGain.connect(this.audioContext.destination);
    } catch (_e) {
      // Handle reconnection errors
      console.error('Master gain reconnection error:', _e);
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
        } catch (_e) {
          // Already disconnected
        }
      }
      
      const isReady = this.audioContext.state === 'running' && this.isWarmedUp;
      
      if (!isReady) {
        console.warn('Audio not ready, attempting automatic recovery...', {
          state: this.audioContext.state,
          warmedUp: this.isWarmedUp
        });
        
        // Attempt automatic recovery
        try {
          await this.initializeWithRetry();
          return this.audioContext.state === 'running' && this.isWarmedUp;
        } catch (recoveryError) {
          console.error('Audio recovery failed:', recoveryError);
          return false;
        }
      }
      
      return isReady;
    } catch (error) {
      console.error('Audio readiness check failed:', error);
      // Try one automatic recovery attempt
      try {
        await this.initializeWithRetry();
        return this.audioContext.state === 'running' && this.isWarmedUp;
      } catch (recoveryError) {
        console.error('Audio recovery failed:', recoveryError);
        return false;
      }
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
    } catch (_e) {
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