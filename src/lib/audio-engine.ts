import { AudioConfig, AudioBufferPool, SoundLevel, SoundType } from '@/types/metronome';

export class AudioEngine {
  private audioContext: AudioContext;
  private bufferPool: AudioBufferPool | null = null;
  private config: AudioConfig;
  
  constructor() {
    this.config = {
      sampleRate: 44100,
      bufferSize: 512,
      lookaheadTime: 0.025, // 25ms
      scheduleInterval: 0.025 // 25ms
    };
    
    this.audioContext = new AudioContext({
      sampleRate: this.config.sampleRate,
      latencyHint: 'playback' // Optimize for low latency
    });
  }

  async initialize(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Create audio buffer pool for zero-latency playback
    this.bufferPool = await this.createAudioBuffers();
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
    if (!this.bufferPool) return;
    
    const source = this.audioContext.createBufferSource();
    source.buffer = this.bufferPool[level];
    source.connect(this.audioContext.destination);
    source.start(time);
  }

  getCurrentTime(): number {
    return this.audioContext.currentTime;
  }

  destroy(): void {
    this.audioContext.close();
  }
}