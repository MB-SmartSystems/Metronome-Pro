import { MetronomeState, MetronomeEngine as IMetronomeEngine, SoundType } from '@/types/metronome';
import { AudioEngine } from './audio-engine';
import { WorkerMessage, WorkerResponse, ScheduledEvent } from '@/workers/metronome-worker';

export class MetronomeEngine implements IMetronomeEngine {
  private audioEngine: AudioEngine;
  private worker: Worker | null = null;
  private state: MetronomeState;
  private initialized = false;

  constructor() {
    this.audioEngine = new AudioEngine();
    this.state = {
      isPlaying: false,
      bpm: 120,
      subdivisions: 1,
      currentBeat: 1,
      currentSubdivision: 1,
      soundType: 'click'
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
    // Create worker from inline script to avoid bundling issues
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
    // Inline the worker script to avoid module loading issues
    return `
      ${this.getWorkerCode()}
    `;
  }

  private getWorkerCode(): string {
    // This would be the content of metronome-worker.ts
    // For now, return a simplified version
    return `
    class MetronomeWorker {
      constructor() {
        this.isRunning = false;
        this.bpm = 120;
        this.subdivisions = 1;
        this.nextNoteTime = 0;
        this.currentBeat = 1;
        this.currentSubdivision = 1;
        this.lookaheadTime = 0.025;
        this.scheduleInterval = 0.025;
        this.timerID = null;
      }

      getBeatLength() {
        return 60.0 / this.bpm;
      }

      getSubdivisionLength() {
        return this.getBeatLength() / this.subdivisions;
      }

      scheduler() {
        const events = [];
        const currentTime = performance.now() / 1000;
        
        while (this.nextNoteTime < currentTime + this.lookaheadTime) {
          let level;
          if (this.currentSubdivision === 1) {
            level = this.currentBeat === 1 ? 'accent' : 'normal';
          } else {
            level = 'subdivision';
          }

          events.push({
            time: this.nextNoteTime,
            level,
            beat: this.currentBeat,
            subdivision: this.currentSubdivision
          });

          this.currentSubdivision++;
          if (this.currentSubdivision > this.subdivisions) {
            this.currentSubdivision = 1;
            this.currentBeat++;
            if (this.currentBeat > 4) {
              this.currentBeat = 1;
            }
          }

          this.nextNoteTime += this.getSubdivisionLength();
        }

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
        this.nextNoteTime = audioContextTime;
        this.currentBeat = 1;
        this.currentSubdivision = 1;
        
        this.timerID = setInterval(() => {
          this.scheduler();
        }, this.scheduleInterval * 1000);
      }

      stop() {
        this.isRunning = false;
        if (this.timerID) {
          clearInterval(this.timerID);
          this.timerID = null;
        }
      }

      setBPM(bpm) {
        this.bpm = Math.max(40, Math.min(240, bpm));
      }

      setSubdivisions(subdivisions) {
        this.subdivisions = Math.max(1, Math.min(6, subdivisions));
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
        }
      }
    }

    const worker = new MetronomeWorker();
    self.addEventListener('message', (e) => {
      worker.handleMessage(e.data);
    });
    `;
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
      case 'error':
        console.error('Worker Error:', message.error);
        break;
    }
  }

  private scheduleAudioEvents(events: ScheduledEvent[]): void {
    const audioTime = this.audioEngine.getCurrentTime();
    
    events.forEach(event => {
      // Convert performance.now() time to AudioContext time
      const scheduleTime = audioTime + (event.time - performance.now() / 1000);
      this.audioEngine.playSound(event.level, scheduleTime);
    });
  }

  start(): void {
    if (!this.initialized || this.state.isPlaying || !this.worker) return;
    
    this.state.isPlaying = true;
    const audioTime = this.audioEngine.getCurrentTime();
    
    this.worker.postMessage({
      type: 'start',
      audioContextTime: audioTime
    } as WorkerMessage);
  }

  stop(): void {
    if (!this.state.isPlaying || !this.worker) return;
    
    this.state.isPlaying = false;
    
    this.worker.postMessage({
      type: 'stop'
    } as WorkerMessage);
  }

  setBPM(bpm: number): void {
    this.state.bpm = Math.max(40, Math.min(240, bpm));
    
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

  setSoundType(type: SoundType): void {
    this.state.soundType = type;
    // Sound type changes are handled by regenerating audio buffers if needed
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