import { MetronomeState, MetronomeEngine as IMetronomeEngine, SoundType, BeatLevel, AccentColor } from '@/types/metronome';
import { AudioEngine } from './audio-engine';
import { WorkerMessage, WorkerResponse, ScheduledEvent } from '@/workers/metronome-worker';

export class MetronomeEngine implements IMetronomeEngine {
  private audioEngine: AudioEngine;
  private worker: Worker | null = null;
  private state: MetronomeState;
  private initialized = false;

  constructor() {
    this.audioEngine = new AudioEngine();
    
    // Erweiterte Standardkonfiguration
    this.state = {
      isPlaying: false,
      bpm: 120,
      subdivisions: 1,
      beatsPerMeasure: 4,
      currentBeat: 1, // Startet bei 1 für korrekte UI-Anzeige
      currentSubdivision: 1,
      soundType: 'click',
      accentColor: 'red',
      beatPattern: ['accent', 'normal', 'normal', 'normal'] // Standard 4/4 Pattern
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize audio engine
    await this.audioEngine.initialize();

    // Create and setup worker
    this.setupWorker();
    
    this.initialized = true;
  }

  private setupWorker(): void {
    const workerScript = this.createWorkerScript();
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    this.worker = new Worker(workerUrl);
    
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      this.handleWorkerMessage(e.data);
    };

    this.worker.onerror = (error) => {
      console.error('Metronome Worker Error:', error);
    };
  }

  private createWorkerScript(): string {
    return `
    class MetronomeWorkerNew {
      constructor() {
        this.isRunning = false;
        this.bpm = 120;
        this.subdivisions = 1;
        this.beatsPerMeasure = 4;
        this.nextNoteTime = 0;
        this.currentBeat = 1;
        this.currentSubdivision = 1;
        this.lookaheadTime = 0.025; // 25ms
        this.scheduleInterval = 0.010; // 10ms for tighter timing
        this.timerID = null;
        this.beatPattern = ['accent', 'normal', 'normal', 'normal'];
        this.startOffset = 0; // Track time offset for sync
      }

      getBeatLength() {
        return 60.0 / this.bpm;
      }

      getSubdivisionLength() {
        return this.getBeatLength() / this.subdivisions;
      }

      scheduler() {
        const events = [];
        // Use high-resolution timer relative to start
        const currentTime = this.startOffset + (performance.now() / 1000);
        
        while (this.nextNoteTime < currentTime + this.lookaheadTime) {
          const beatIndex = this.currentBeat - 1;
          const beatLevel = this.beatPattern[beatIndex] || 'normal';
          
          if (beatLevel !== 'muted') {
            let soundLevel;
            if (this.currentSubdivision === 1) {
              soundLevel = beatLevel === 'accent' ? 'accent' : 'normal';
            } else {
              soundLevel = 'subdivision';
            }

            // Use audio context time directly for scheduling
            events.push({
              audioTime: this.nextNoteTime, // Direct audio context time
              level: soundLevel,
              beat: this.currentBeat,
              subdivision: this.currentSubdivision
            });
          }

          // Update position
          this.currentSubdivision++;
          if (this.currentSubdivision > this.subdivisions) {
            this.currentSubdivision = 1;
            this.currentBeat++;
            if (this.currentBeat > this.beatsPerMeasure) {
              this.currentBeat = 1;
            }
          }

          this.nextNoteTime += this.getSubdivisionLength();
        }

        // Send events and position
        if (events.length > 0) {
          postMessage({ type: 'scheduled', events });
        }

        postMessage({
          type: 'tick',
          beat: this.currentBeat,
          subdivision: this.currentSubdivision
        });
      }

      start(audioContextTime) {
        if (this.isRunning) return;
        
        this.isRunning = true;
        // Set start time and first beat time
        this.startOffset = audioContextTime;
        this.nextNoteTime = audioContextTime; // Start immediately
        this.currentBeat = 1;
        this.currentSubdivision = 1;
        
        // CRITICAL: Schedule first beat immediately
        this.scheduler();
        
        this.timerID = setInterval(() => {
          if (this.isRunning) {
            this.scheduler();
          }
        }, this.scheduleInterval * 1000);
      }

      stop() {
        this.isRunning = false;
        if (this.timerID) {
          clearInterval(this.timerID);
          this.timerID = null;
        }
        this.currentBeat = 1;
        this.currentSubdivision = 1;
      }

      setBPM(bpm) {
        this.bpm = Math.max(40, Math.min(300, bpm));
      }

      setSubdivisions(subdivisions) {
        this.subdivisions = Math.max(1, Math.min(6, subdivisions));
      }

      setBeatsPerMeasure(beats) {
        this.beatsPerMeasure = Math.max(2, Math.min(16, beats));
        if (this.currentBeat > this.beatsPerMeasure) {
          this.currentBeat = 1;
        }
      }

      setBeatPattern(pattern) {
        this.beatPattern = pattern;
      }

      handleMessage(data) {
        switch (data.type) {
          case 'start':
            this.start(data.audioContextTime || 0);
            break;
          case 'stop':
            this.stop();
            break;
          case 'setBPM':
            if (data.bpm) this.setBPM(data.bpm);
            break;
          case 'setSubdivisions':
            if (data.subdivisions) this.setSubdivisions(data.subdivisions);
            break;
          case 'setBeatsPerMeasure':
            if (data.beats) this.setBeatsPerMeasure(data.beats);
            break;
          case 'setBeatPattern':
            if (data.pattern) this.setBeatPattern(data.pattern);
            break;
        }
      }
    }

    const worker = new MetronomeWorkerNew();
    self.addEventListener('message', (e) => {
      worker.handleMessage(e.data);
    });
    `;
  }

  private handleWorkerMessage(message: any): void {
    switch (message.type) {
      case 'scheduled':
        if (message.events) {
          this.scheduleAudioEvents(message.events);
        }
        break;
      case 'tick':
        if (message.beat !== undefined && message.subdivision !== undefined) {
          this.state.currentBeat = message.beat;
          this.state.currentSubdivision = message.subdivision;
        }
        break;
      case 'error':
        console.error('Worker Error:', message.error);
        break;
    }
  }

  private scheduleAudioEvents(events: any[]): void {    
    events.forEach(event => {
      // Use direct audio context time - no conversion needed
      const scheduleTime = event.audioTime;
      
      // Only schedule if time is in the future
      const currentAudioTime = this.audioEngine.getCurrentTime();
      if (scheduleTime >= currentAudioTime) {
        this.audioEngine.playSound(event.level, scheduleTime);
      } else {
        // If we missed the timing, play immediately
        this.audioEngine.playSound(event.level, currentAudioTime);
      }
    });
  }

  async start(): Promise<void> {
    if (!this.initialized || this.state.isPlaying || !this.worker) return;
    
    // Ensure audio system is fully ready (critical for mobile)
    const audioReady = await this.audioEngine.ensureAudioReady();
    if (!audioReady) {
      console.warn('Audio system not ready, attempting to start anyway');
    }
    
    this.state.isPlaying = true;
    
    // Get current audio time with minimal delay for immediate start
    const audioTime = this.audioEngine.getCurrentTime();
    const startTime = audioTime + 0.002; // Reduced to 2ms for faster response
    
    // Reset position
    this.state.currentBeat = 1;
    this.state.currentSubdivision = 1;
    
    // Log audio system info for debugging
    console.log('Audio system info:', this.audioEngine.getAudioInfo());
    console.log(`Starting metronome at audio time: ${startTime} (current: ${audioTime})`);
    
    this.worker.postMessage({
      type: 'start',
      audioContextTime: startTime
    } as WorkerMessage);
  }

  stop(): void {
    if (!this.state.isPlaying || !this.worker) return;
    
    this.state.isPlaying = false;
    
    // Reset zu Beat 1 bei Stop
    this.state.currentBeat = 1;
    this.state.currentSubdivision = 1;
    
    this.worker.postMessage({
      type: 'stop'
    } as WorkerMessage);
  }

  setBPM(bpm: number): void {
    this.state.bpm = Math.max(40, Math.min(300, bpm));
    
    if (this.worker) {
      this.worker.postMessage({
        type: 'setBPM',
        bpm: this.state.bpm
      } as WorkerMessage);
    }
  }

  setSubdivisions(subdivisions: number): void {
    this.state.subdivisions = Math.max(1, Math.min(6, subdivisions));
    
    if (this.worker) {
      this.worker.postMessage({
        type: 'setSubdivisions',
        subdivisions: this.state.subdivisions
      } as WorkerMessage);
    }
  }

  setBeatsPerMeasure(beats: number): void {
    const newBeats = Math.max(2, Math.min(16, beats));
    this.state.beatsPerMeasure = newBeats;
    
    // Beat-Pattern anpassen
    const newPattern: BeatLevel[] = [];
    for (let i = 0; i < newBeats; i++) {
      if (i < this.state.beatPattern.length) {
        newPattern.push(this.state.beatPattern[i]);
      } else {
        newPattern.push(i === 0 ? 'accent' : 'normal'); // Erster Beat Akzent, Rest normal
      }
    }
    this.state.beatPattern = newPattern;
    
    if (this.worker) {
      this.worker.postMessage({
        type: 'setBeatsPerMeasure',
        beats: newBeats
      } as WorkerMessage);
      
      this.worker.postMessage({
        type: 'setBeatPattern',
        pattern: newPattern
      } as WorkerMessage);
    }
  }

  setSoundType(type: SoundType): void {
    this.state.soundType = type;
  }

  setAccentColor(color: AccentColor): void {
    this.state.accentColor = color;
  }

  setBeatLevel(beatIndex: number, level: BeatLevel): void {
    if (beatIndex >= 0 && beatIndex < this.state.beatPattern.length) {
      const newPattern = [...this.state.beatPattern];
      newPattern[beatIndex] = level;
      this.state.beatPattern = newPattern;
      
      if (this.worker) {
        this.worker.postMessage({
          type: 'setBeatPattern',
          pattern: newPattern
        } as WorkerMessage);
      }
    }
  }

  getState(): MetronomeState {
    return { ...this.state };
  }

  destroy(): void {
    this.stop();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.audioEngine.destroy();
  }
}