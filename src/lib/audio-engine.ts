import * as Tone from 'tone';
import { SoundLevel } from '@/types/metronome';

export class AudioEngine {
  private synths: Map<SoundLevel, Tone.Oscillator> = new Map();
  private reverb: Tone.Reverb;
  private compressor: Tone.Compressor;
  private gainNode: Tone.Gain;
  private isInitialized = false;
  private isWarmedUp = false;
  
  // Tone.js optimized sound definitions
  private soundConfig = {
    accent: { frequency: 1000, gain: 0.8, attack: 0.001, decay: 0.08, release: 0.01 },
    normal: { frequency: 800, gain: 0.6, attack: 0.001, decay: 0.06, release: 0.01 },
    subdivision: { frequency: 600, gain: 0.3, attack: 0.001, decay: 0.04, release: 0.01 }
  };

  constructor() {
    // Initialize Tone.js audio chain
    this.reverb = new Tone.Reverb({
      decay: 0.1,
      wet: 0.1
    });
    
    this.compressor = new Tone.Compressor({
      threshold: -12,
      ratio: 3,
      attack: 0.003,
      release: 0.01
    });
    
    this.gainNode = new Tone.Gain(0.8);
    
    // Connect effects chain: compressor -> reverb -> gain -> destination
    this.compressor.connect(this.reverb);
    this.reverb.connect(this.gainNode);
    this.gainNode.toDestination();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Start Tone.js audio context
      await Tone.start();
      
      // Optimize Tone.js for low latency
      Tone.getContext().lookAhead = 0.01; // 10ms lookahead
      Tone.getContext().latencyHint = "interactive";
      
      // Create optimized oscillators for each sound level
      this.createSynths();
      
      // Warm up the audio pipeline
      await this.warmUpAudioPipeline();
      
      this.isInitialized = true;
      this.isWarmedUp = true;
      
      console.log('🎵 Tone.js Audio Engine initialized', {
        context: Tone.getContext().state,
        sampleRate: Tone.getContext().sampleRate,
        baseLatency: Tone.getContext().baseLatency,
        lookAhead: Tone.getContext().lookAhead
      });
      
    } catch (error) {
      console.error('Audio Engine initialization failed:', error);
      throw error;
    }
  }

  private createSynths(): void {
    // Create dedicated synths for each sound level with optimal settings
    Object.entries(this.soundConfig).forEach(([soundLevel, config]) => {
      const synth = new Tone.Oscillator({
        frequency: config.frequency,
        type: "sine"
      });
      
      // Create envelope for clean attack/decay
      const envelope = new Tone.AmplitudeEnvelope({
        attack: config.attack,
        decay: config.decay,
        sustain: 0,
        release: config.release
      });
      
      const synthGain = new Tone.Gain(config.gain);
      
      // Connect: oscillator -> envelope -> gain -> effects chain
      synth.connect(envelope);
      envelope.connect(synthGain);
      synthGain.connect(this.compressor);
      
      // Store references for triggering
      this.synths.set(soundLevel as SoundLevel, synth);
    });
  }

  private async warmUpAudioPipeline(): Promise<void> {
    // Warm up by playing silent sounds to prepare the audio pipeline
    const warmupPromises: Promise<void>[] = [];
    
    this.synths.forEach((synth) => {
      const warmupPromise = new Promise<void>((resolve) => {
        // Start oscillator
        synth.start();
        
        // Trigger silent envelope
        const envelope = synth.output as Tone.AmplitudeEnvelope;
        if (envelope && envelope.triggerAttackRelease) {
          envelope.triggerAttackRelease(0.001, "+0");
        }
        
        setTimeout(resolve, 10);
      });
      
      warmupPromises.push(warmupPromise);
    });
    
    await Promise.all(warmupPromises);
    console.log('🎵 Audio pipeline warmed up');
  }

  playSound(level: SoundLevel, time?: number): boolean {
    if (!this.isInitialized || !this.isWarmedUp) {
      console.warn('Audio engine not ready');
      return false;
    }

    try {
      const config = this.soundConfig[level];
      if (!config) return false;
      
      // Use Tone.js precise timing - convert to Tone time if provided
      const toneTime = time ? Tone.Time(time).toSeconds() : "now";
      
      // Create a quick synth instance for this sound
      const quickSynth = new Tone.FMSynth({
        harmonicity: 1,
        modulationIndex: 1,
        envelope: {
          attack: config.attack,
          decay: config.decay,
          sustain: 0,
          release: config.release
        },
        modulation: {
          type: "sine"
        },
        modulationEnvelope: {
          attack: 0.001,
          decay: 0.02,
          sustain: 0,
          release: 0.01
        }
      });
      
      const levelGain = new Tone.Gain(config.gain);
      quickSynth.connect(levelGain);
      levelGain.connect(this.compressor);
      
      // Trigger the sound with precise timing
      quickSynth.triggerAttackRelease(
        config.frequency,
        config.decay + config.release,
        toneTime
      );
      
      // Clean up after sound completes
      setTimeout(() => {
        try {
          levelGain.disconnect();
          quickSynth.dispose();
        } catch {
          // Already disposed
        }
      }, (config.decay + config.release) * 1000 + 100);
      
      return true;
      
    } catch (error) {
      console.error('Sound playback error:', error);
      return false;
    }
  }

  stopAllSounds(): void {
    try {
      // Stop all active sounds immediately
      Tone.getDestination().volume.rampTo(-Infinity, 0.01);
      
      // Reset volume after brief silence
      setTimeout(() => {
        if (this.isInitialized) {
          Tone.getDestination().volume.rampTo(0, 0.01);
        }
      }, 50);
      
    } catch (error) {
      console.error('Stop all sounds error:', error);
    }
  }

  getCurrentTime(): number {
    return Tone.now();
  }

  async ensureAudioReady(): Promise<boolean> {
    try {
      // Ensure Tone.js context is started
      if (Tone.getContext().state !== 'running') {
        await Tone.start();
      }
      
      // Check initialization
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      return this.isInitialized && this.isWarmedUp && Tone.getContext().state === 'running';
      
    } catch (error) {
      console.error('Audio readiness check failed:', error);
      return false;
    }
  }

  getAudioInfo(): object {
    const context = Tone.getContext();
    return {
      state: context.state,
      sampleRate: context.sampleRate,
      baseLatency: context.baseLatency,
      lookAhead: context.lookAhead,
      currentTime: Tone.now(),
      isInitialized: this.isInitialized,
      isWarmedUp: this.isWarmedUp,
      toneVersion: Tone.version
    };
  }

  destroy(): void {
    try {
      // Stop all sounds
      this.stopAllSounds();
      
      // Dispose of all synths
      this.synths.forEach(synth => {
        try {
          synth.dispose();
        } catch {
          // Already disposed
        }
      });
      this.synths.clear();
      
      // Dispose of effects
      this.reverb.dispose();
      this.compressor.dispose();
      this.gainNode.dispose();
      
      this.isInitialized = false;
      this.isWarmedUp = false;
      
      console.log('🎵 Tone.js Audio Engine destroyed');
      
    } catch (error) {
      console.error('Audio engine destruction error:', error);
    }
  }
}