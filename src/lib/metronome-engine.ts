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
      currentBeat: 0, // Startet bei 0, wird zu 1 bei erstem Start
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
        this.currentBeat = 1; // Beginnt bei 1 für ersten Beat
        this.currentSubdivision = 1;
        this.lookaheadTime = 0.025; // 25ms
        this.scheduleInterval = 0.025; // 25ms
        this.timerID = null;
        this.beatPattern = ['accent', 'normal', 'normal', 'normal'];
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
          const beatIndex = this.currentBeat - 1;
          const beatLevel = this.beatPattern[beatIndex] || 'normal';
          
          // Nur Sound-Event erstellen wenn Beat nicht stumm ist
          if (beatLevel !== 'muted') {
            let soundLevel;
            if (this.currentSubdivision === 1) {
              // Hauptschlag - verwende Beat-Pattern
              soundLevel = beatLevel === 'accent' ? 'accent' : 'normal';
            } else {
              // Subdivision
              soundLevel = 'subdivision';
            }

            events.push({
              time: this.nextNoteTime,
              level: soundLevel,
              beat: this.currentBeat,
              subdivision: this.currentSubdivision
            });
          }

          // Update Beat/Subdivision Position
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

        // Sende Events und aktuelle Position
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
        // WICHTIG: Korrekt bei 1 starten, nicht bei 0
        this.currentBeat = 1;
        this.currentSubdivision = 1;
        
        // Sofortiger erster Scheduler-Aufruf für sofortigen Start
        this.scheduler();
        
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
        // Reset zu Beat 1 bei Stop
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
        // Reset auf Beat 1 bei Änderung
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
      const scheduleTime = audioTime + (event.time - performance.now() / 1000);
      this.audioEngine.playSound(event.level, scheduleTime);
    });
  }

  start(): void {
    if (!this.initialized || this.state.isPlaying || !this.worker) return;
    
    this.state.isPlaying = true;
    const audioTime = this.audioEngine.getCurrentTime();
    
    // Reset zu Beat 1 bei Start
    this.state.currentBeat = 1;
    this.state.currentSubdivision = 1;
    
    this.worker.postMessage({
      type: 'start',
      audioContextTime: audioTime
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