import { MetronomeState, MetronomeEngine as IMetronomeEngine, SoundType, BeatLevel, AccentColor } from '@/types/metronome';
import { AudioEngine } from './audio-engine';

interface WorkerMessage {
  type: 'start' | 'stop' | 'pause' | 'resume' | 'setBPM' | 'setSubdivisions' | 'setBeatsPerMeasure' | 'setBeatPattern';
  bpm?: number;
  subdivisions?: number;
  beats?: number;
  pattern?: BeatLevel[];
  audioContextTime?: number;
}

interface WorkerResponse {
  type: 'scheduled' | 'tick' | 'error' | 'stopped';
  events?: ScheduledEvent[];
  beat?: number;
  subdivision?: number;
  error?: string;
}

interface ScheduledEvent {
  audioTime: number;
  level: 'accent' | 'normal' | 'subdivision';
  beat: number;
  subdivision: number;
}

export class MetronomeEngine implements IMetronomeEngine {
  private audioEngine: AudioEngine;
  private worker: Worker | null = null;
  private workerBlobUrl: string | null = null;
  private state: MetronomeState;
  private initialized = false;
  private audioSources: Set<AudioBufferSourceNode> = new Set();

  constructor() {
    this.audioEngine = new AudioEngine();
    
    this.state = {
      isPlaying: false,
      bpm: 120,
      subdivisions: 1,
      beatsPerMeasure: 4,
      currentBeat: 1, // Always starts at 1
      currentSubdivision: 1,
      soundType: 'click',
      accentColor: 'red',
      beatPattern: ['accent', 'normal', 'normal', 'normal']
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize audio engine first
    await this.audioEngine.initialize();

    // Create and setup worker
    this.setupWorker();
    
    this.initialized = true;
  }

  private setupWorker(): void {
    const workerScript = this.createWorkerScript();
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    this.workerBlobUrl = URL.createObjectURL(blob);
    
    this.worker = new Worker(this.workerBlobUrl);
    
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      this.handleWorkerMessage(e.data);
    };

    this.worker.onerror = (error) => {
      console.error('Metronome Worker Error:', error);
    };

    // Send initial configuration
    this.syncWorkerState();
  }

  private createWorkerScript(): string {
    return `
    class MetronomeWorkerFixed {
      constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.bpm = 120;
        this.subdivisions = 1;
        this.beatsPerMeasure = 4;
        this.nextNoteTime = 0;
        this.currentBeat = 1;
        this.currentSubdivision = 1;
        this.lookaheadTime = 0.015; // 15ms lookahead
        this.scheduleInterval = 0.008; // 8ms scheduling
        this.timerID = null;
        this.beatPattern = ['accent', 'normal', 'normal', 'normal'];
        this.startTime = 0;
        this.pausedTime = 0;
        this.pausedDuration = 0;
      }

      getBeatLength() {
        return 60.0 / this.bpm;
      }

      getSubdivisionLength() {
        return this.getBeatLength() / this.subdivisions;
      }

      scheduler() {
        if (!this.isRunning || this.isPaused) return;

        const events = [];
        const currentTime = performance.now() / 1000;
        const adjustedCurrentTime = this.startTime + currentTime - this.pausedDuration;
        
        while (this.nextNoteTime < adjustedCurrentTime + this.lookaheadTime) {
          const beatIndex = this.currentBeat - 1;
          const beatLevel = this.beatPattern[beatIndex] || 'normal';
          
          if (beatLevel !== 'muted') {
            let soundLevel;
            if (this.currentSubdivision === 1) {
              soundLevel = beatLevel === 'accent' ? 'accent' : 'normal';
            } else {
              soundLevel = 'subdivision';
            }

            events.push({
              audioTime: this.nextNoteTime,
              level: soundLevel,
              beat: this.currentBeat,
              subdivision: this.currentSubdivision
            });
          }

          // Advance position
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

        if (events.length > 0) {
          postMessage({ type: 'scheduled', events });
        }

        // Always send tick for UI updates
        postMessage({
          type: 'tick',
          beat: this.currentBeat,
          subdivision: this.currentSubdivision
        });
      }

      start(audioContextTime) {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = audioContextTime;
        this.nextNoteTime = audioContextTime + 0.001; // Tiny delay to ensure audio readiness
        this.currentBeat = 1; // CRITICAL: Always start at beat 1
        this.currentSubdivision = 1;
        this.pausedDuration = 0;
        
        // Immediate first scheduler call
        this.scheduler();
        
        this.timerID = setInterval(() => {
          this.scheduler();
        }, this.scheduleInterval * 1000);
      }

      pause() {
        if (!this.isRunning || this.isPaused) return;
        
        this.isPaused = true;
        this.pausedTime = performance.now() / 1000;
        
        if (this.timerID) {
          clearInterval(this.timerID);
          this.timerID = null;
        }
        
        postMessage({ type: 'tick', beat: this.currentBeat, subdivision: this.currentSubdivision });
      }

      resume(audioContextTime) {
        if (!this.isRunning || !this.isPaused) return;
        
        const pauseDuration = (performance.now() / 1000) - this.pausedTime;
        this.pausedDuration += pauseDuration;
        
        this.isPaused = false;
        
        // Resume scheduling
        this.timerID = setInterval(() => {
          this.scheduler();
        }, this.scheduleInterval * 1000);
        
        this.scheduler();
      }

      stop() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.timerID) {
          clearInterval(this.timerID);
          this.timerID = null;
        }
        
        // Reset to start position
        this.currentBeat = 1;
        this.currentSubdivision = 1;
        this.pausedDuration = 0;
        
        postMessage({ 
          type: 'stopped', 
          beat: 1, 
          subdivision: 1 
        });
      }

      setBPM(bpm) {
        this.bpm = Math.max(40, Math.min(300, bpm));
        // If running, adjust nextNoteTime to maintain beat sync
        if (this.isRunning && !this.isPaused) {
          // Recalculate next note time based on new BPM
          const beatProgress = (this.currentSubdivision - 1) / this.subdivisions;
          const currentBeatTime = this.nextNoteTime - ((this.subdivisions - this.currentSubdivision + 1) * this.getSubdivisionLength());
          this.nextNoteTime = currentBeatTime + (beatProgress * this.getBeatLength()) + ((this.subdivisions - this.currentSubdivision + 1) * this.getSubdivisionLength());
        }
      }

      setSubdivisions(subdivisions) {
        this.subdivisions = Math.max(1, Math.min(6, subdivisions));
        // Reset subdivision position if current exceeds new max
        if (this.currentSubdivision > subdivisions) {
          this.currentSubdivision = 1;
          this.currentBeat++;
          if (this.currentBeat > this.beatsPerMeasure) {
            this.currentBeat = 1;
          }
        }
      }

      setBeatsPerMeasure(beats) {
        this.beatsPerMeasure = Math.max(2, Math.min(16, beats));
        // Reset beat position if current exceeds new max
        if (this.currentBeat > beats) {
          this.currentBeat = 1;
        }
      }

      setBeatPattern(pattern) {
        this.beatPattern = pattern || ['accent', 'normal', 'normal', 'normal'];
      }

      handleMessage(data) {
        switch (data.type) {
          case 'start':
            this.start(data.audioContextTime || 0);
            break;
          case 'pause':
            this.pause();
            break;
          case 'resume':
            this.resume(data.audioContextTime || 0);
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

    const worker = new MetronomeWorkerFixed();
    self.addEventListener('message', (e) => {
      worker.handleMessage(e.data);
    });
    `;
  }

  private syncWorkerState(): void {
    if (!this.worker) return;
    
    this.worker.postMessage({
      type: 'setBPM',
      bpm: this.state.bpm
    } as WorkerMessage);

    this.worker.postMessage({
      type: 'setSubdivisions',
      subdivisions: this.state.subdivisions
    } as WorkerMessage);

    this.worker.postMessage({
      type: 'setBeatsPerMeasure',
      beats: this.state.beatsPerMeasure
    } as WorkerMessage);

    this.worker.postMessage({
      type: 'setBeatPattern',
      pattern: this.state.beatPattern
    } as WorkerMessage);
  }

  private handleWorkerMessage(message: WorkerResponse): void {
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
      case 'stopped':
        this.state.isPlaying = false;
        this.state.currentBeat = 1;
        this.state.currentSubdivision = 1;
        this.cleanupAllAudioSources();
        break;
      case 'error':
        console.error('Worker Error:', message.error);
        break;
    }
  }

  private scheduleAudioEvents(events: ScheduledEvent[]): void {
    events.forEach(event => {
      const scheduleTime = event.audioTime;
      const currentAudioTime = this.audioEngine.getCurrentTime();
      
      if (scheduleTime >= currentAudioTime - 0.01) { // 10ms tolerance
        const source = this.audioEngine.playSound(event.level, Math.max(scheduleTime, currentAudioTime));
        if (source) {
          this.audioSources.add(source);
          
          // Auto-cleanup after 1 second
          source.onended = () => {
            this.audioSources.delete(source);
          };
          
          setTimeout(() => {
            if (this.audioSources.has(source)) {
              this.audioSources.delete(source);
            }
          }, 1000);
        }
      }
    });
  }

  private cleanupAllAudioSources(): void {
    this.audioSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Source may already be stopped
      }
    });
    this.audioSources.clear();
  }

  async start(): Promise<void> {
    if (!this.initialized || this.state.isPlaying || !this.worker) return;
    
    // Clean up any leftover audio sources
    this.cleanupAllAudioSources();
    
    // Ensure audio system is ready
    const audioReady = await this.audioEngine.ensureAudioReady();
    if (!audioReady) {
      throw new Error('Audio system not ready');
    }
    
    this.state.isPlaying = true;
    this.state.currentBeat = 1; // Always start at beat 1
    this.state.currentSubdivision = 1;
    
    const audioTime = this.audioEngine.getCurrentTime();
    const startTime = audioTime + 0.002; // 2ms delay for audio readiness
    
    // Starting metronome at beat 1
    
    this.worker.postMessage({
      type: 'start',
      audioContextTime: startTime
    } as WorkerMessage);
  }

  pause(): void {
    if (!this.state.isPlaying || !this.worker) return;
    
    // Pausing metronome - stopping all audio immediately
    
    // Immediately stop all current audio sources
    this.cleanupAllAudioSources();
    
    this.worker.postMessage({
      type: 'pause'
    } as WorkerMessage);
  }

  resume(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.state.isPlaying || !this.worker) {
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
        
        const audioTime = this.audioEngine.getCurrentTime();
        const resumeTime = audioTime + 0.002;
        
        // Resuming metronome from current position
        
        this.worker.postMessage({
          type: 'resume',
          audioContextTime: resumeTime
        } as WorkerMessage);
        
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  stop(): void {
    if (!this.worker) return;
    
    // Stopping metronome - resetting to beat 1
    
    // Immediately cleanup all audio
    this.cleanupAllAudioSources();
    
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
    
    // Adjust beat pattern
    const newPattern: BeatLevel[] = [];
    for (let i = 0; i < newBeats; i++) {
      if (i < this.state.beatPattern.length) {
        newPattern.push(this.state.beatPattern[i]);
      } else {
        newPattern.push(i === 0 ? 'accent' : 'normal');
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
    
    // Clean up all audio sources
    this.cleanupAllAudioSources();
    
    // Terminate worker properly
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // Clean up blob URL
    if (this.workerBlobUrl) {
      URL.revokeObjectURL(this.workerBlobUrl);
      this.workerBlobUrl = null;
    }
    
    this.audioEngine.destroy();
    this.initialized = false;
  }
}