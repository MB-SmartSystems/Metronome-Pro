import * as Tone from 'tone';
import { MetronomeState, MetronomeEngine as IMetronomeEngine, SoundType, BeatLevel, AccentColor } from '@/types/metronome';
import { AudioEngine } from './audio-engine';

export class MetronomeEngine implements IMetronomeEngine {
  private audioEngine: AudioEngine;
  private state: MetronomeState;
  private initialized = false;
  private beatEventId: number | null = null;
  private subdivisionEventId: number | null = null;
  private onStateChangeCallback?: (state: MetronomeState) => void;

  constructor() {
    this.audioEngine = new AudioEngine();
    
    this.state = {
      isPlaying: false,
      bpm: 120,
      subdivisions: 1,
      beatsPerMeasure: 4,
      currentBeat: 1,
      currentSubdivision: 1,
      soundType: 'click',
      accentColor: 'red',
      beatPattern: ['accent', 'normal', 'normal', 'normal']
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize audio engine first
      await this.audioEngine.initialize();
      
      // Setup Tone.Transport for precise timing
      Tone.Transport.bpm.value = this.state.bpm;
      Tone.Transport.timeSignature = this.state.beatsPerMeasure;
      
      // Configure Transport for minimal latency
      Tone.Transport.lookAhead = 0.01; // 10ms lookahead
      Tone.Transport.swing = 0; // No swing
      Tone.Transport.swingSubdivision = "8n";
      
      console.log('🎯 Tone.Transport Metronome Engine initialized', {
        bpm: Tone.Transport.bpm.value,
        timeSignature: Tone.Transport.timeSignature,
        lookAhead: Tone.Transport.lookAhead
      });
      
      this.initialized = true;
      
    } catch (error) {
      console.error('Metronome Engine initialization failed:', error);
      throw error;
    }
  }

  private scheduleBeatEvents(): void {
    // Clear existing events
    this.clearEvents();
    
    // Calculate note values based on subdivisions
    const beatNote = "4n"; // Quarter note for beats
    const subdivisionNote = this.getSubdivisionNote();
    
    // Schedule beat events using Tone.Transport
    this.beatEventId = Tone.Transport.scheduleRepeat((time) => {
      this.onBeatTrigger(time);
    }, beatNote, 0);
    
    // Schedule subdivision events if needed
    if (this.state.subdivisions > 1) {
      this.subdivisionEventId = Tone.Transport.scheduleRepeat((time) => {
        this.onSubdivisionTrigger(time);
      }, subdivisionNote, 0);
    }
  }

  private getSubdivisionNote(): Tone.Unit.Time {
    // Convert subdivisions to Tone.js note values
    switch (this.state.subdivisions) {
      case 2: return "8n"; // Eighth notes
      case 3: return "8t"; // Eighth note triplets
      case 4: return "16n"; // Sixteenth notes
      case 6: return "16t"; // Sixteenth note triplets
      default: return "4n"; // Quarter notes (fallback)
    }
  }

  private onBeatTrigger(time: number): void {
    const beatIndex = (this.state.currentBeat - 1) % this.state.beatsPerMeasure;
    const beatLevel = this.state.beatPattern[beatIndex] || 'normal';
    
    // Only play sound if beat is not muted
    if (beatLevel !== 'muted') {
      const soundLevel = beatLevel === 'accent' ? 'accent' : 'normal';
      this.audioEngine.playSound(soundLevel, time);
    }
    
    // Update beat position
    this.state.currentBeat = (this.state.currentBeat % this.state.beatsPerMeasure) + 1;
    this.state.currentSubdivision = 1; // Reset subdivision on beat change
    
    // Notify state change for visual updates
    this.notifyStateChange();
  }

  private onSubdivisionTrigger(time: number): void {
    // Only trigger on subdivisions (not on main beats)
    const isMainBeat = (this.state.currentSubdivision === 1);
    
    if (!isMainBeat) {
      const beatIndex = (this.state.currentBeat - 1) % this.state.beatsPerMeasure;
      const beatLevel = this.state.beatPattern[beatIndex] || 'normal';
      
      // Play subdivision sound if beat is not muted
      if (beatLevel !== 'muted') {
        this.audioEngine.playSound('subdivision', time);
      }
    }
    
    // Update subdivision position
    this.state.currentSubdivision = (this.state.currentSubdivision % this.state.subdivisions) + 1;
    
    // Notify state change for visual updates
    this.notifyStateChange();
  }

  private clearEvents(): void {
    if (this.beatEventId !== null) {
      Tone.Transport.clear(this.beatEventId);
      this.beatEventId = null;
    }
    
    if (this.subdivisionEventId !== null) {
      Tone.Transport.clear(this.subdivisionEventId);
      this.subdivisionEventId = null;
    }
  }

  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({ ...this.state });
    }
  }

  public onStateChange(callback: (state: MetronomeState) => void): void {
    this.onStateChangeCallback = callback;
  }

  async start(): Promise<void> {
    if (!this.initialized || this.state.isPlaying) return;
    
    try {
      // Ensure audio is ready
      const audioReady = await this.audioEngine.ensureAudioReady();
      if (!audioReady) {
        throw new Error('Audio system not ready');
      }
      
      // Reset position to beat 1
      this.state.currentBeat = 1;
      this.state.currentSubdivision = 1;
      this.state.isPlaying = true;
      
      // Schedule events
      this.scheduleBeatEvents();
      
      // Start Tone.Transport - this provides perfect timing
      Tone.Transport.start();
      
      console.log('🎯 Metronome started with Tone.Transport');
      this.notifyStateChange();
      
    } catch (error) {
      console.error('Metronome start failed:', error);
      this.state.isPlaying = false;
      throw error;
    }
  }

  pause(): void {
    if (!this.state.isPlaying) return;
    
    // Pause Tone.Transport - maintains position
    Tone.Transport.pause();
    
    // Stop all current sounds
    this.audioEngine.stopAllSounds();
    
    this.state.isPlaying = false;
    console.log('🎯 Metronome paused');
    this.notifyStateChange();
  }

  resume(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.state.isPlaying) {
        resolve();
        return;
      }
      
      try {
        // Ensure audio is ready
        const audioReady = await this.audioEngine.ensureAudioReady();
        if (!audioReady) {
          reject(new Error('Audio system not ready'));
          return;
        }
        
        // Resume Tone.Transport - continues from pause position
        Tone.Transport.start();
        
        this.state.isPlaying = true;
        console.log('🎯 Metronome resumed');
        this.notifyStateChange();
        resolve();
        
      } catch (error) {
        reject(error);
      }
    });
  }

  stop(): void {
    // Stop Tone.Transport
    Tone.Transport.stop();
    
    // Clear all scheduled events
    this.clearEvents();
    
    // Stop all sounds
    this.audioEngine.stopAllSounds();
    
    // Reset state
    this.state.isPlaying = false;
    this.state.currentBeat = 1;
    this.state.currentSubdivision = 1;
    
    console.log('🎯 Metronome stopped - reset to beat 1');
    this.notifyStateChange();
  }

  setBPM(bpm: number): void {
    const newBPM = Math.max(40, Math.min(300, bpm));
    this.state.bpm = newBPM;
    
    // Update Tone.Transport BPM - changes immediately with smooth ramp
    Tone.Transport.bpm.rampTo(newBPM, 0.1); // 100ms ramp for smooth BPM changes
    
    console.log(`🎯 BPM changed to ${newBPM}`);
    this.notifyStateChange();
  }

  setSubdivisions(subdivisions: number): void {
    const newSubdivisions = Math.max(1, Math.min(6, subdivisions));
    this.state.subdivisions = newSubdivisions;
    
    // If playing, reschedule events with new subdivisions
    if (this.state.isPlaying) {
      this.scheduleBeatEvents();
    }
    
    // Reset subdivision position if exceeds new max
    if (this.state.currentSubdivision > newSubdivisions) {
      this.state.currentSubdivision = 1;
    }
    
    console.log(`🎯 Subdivisions changed to ${newSubdivisions}`);
    this.notifyStateChange();
  }

  setBeatsPerMeasure(beats: number): void {
    const newBeats = Math.max(2, Math.min(16, beats));
    this.state.beatsPerMeasure = newBeats;
    
    // Update Tone.Transport time signature
    Tone.Transport.timeSignature = newBeats;
    
    // Adjust beat pattern to match new measure length
    const newPattern: BeatLevel[] = [];
    for (let i = 0; i < newBeats; i++) {
      if (i < this.state.beatPattern.length) {
        newPattern.push(this.state.beatPattern[i]);
      } else {
        newPattern.push(i === 0 ? 'accent' : 'normal');
      }
    }
    this.state.beatPattern = newPattern;
    
    // Reset beat position if exceeds new max
    if (this.state.currentBeat > newBeats) {
      this.state.currentBeat = 1;
    }
    
    // Reschedule events if playing
    if (this.state.isPlaying) {
      this.scheduleBeatEvents();
    }
    
    console.log(`🎯 Beats per measure changed to ${newBeats}`);
    this.notifyStateChange();
  }

  setSoundType(type: SoundType): void {
    this.state.soundType = type;
    this.notifyStateChange();
  }

  setAccentColor(color: AccentColor): void {
    this.state.accentColor = color;
    this.notifyStateChange();
  }

  setBeatLevel(beatIndex: number, level: BeatLevel): void {
    if (beatIndex >= 0 && beatIndex < this.state.beatPattern.length) {
      const newPattern = [...this.state.beatPattern];
      newPattern[beatIndex] = level;
      this.state.beatPattern = newPattern;
      
      console.log(`🎯 Beat ${beatIndex + 1} set to ${level}`);
      this.notifyStateChange();
    }
  }

  getState(): MetronomeState {
    return { ...this.state };
  }

  destroy(): void {
    console.log('🎯 Destroying Tone.Transport Metronome Engine...');
    
    // Stop everything
    this.stop();
    
    // Clear all Transport events
    Tone.Transport.cancel();
    
    // Reset Transport
    Tone.Transport.bpm.value = 120;
    Tone.Transport.timeSignature = 4;
    
    // Destroy audio engine
    this.audioEngine.destroy();
    
    this.initialized = false;
    this.onStateChangeCallback = undefined;
    
    console.log('🎯 Metronome Engine destroyed');
  }
}