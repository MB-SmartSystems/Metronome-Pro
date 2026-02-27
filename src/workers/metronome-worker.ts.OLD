// Metronome Worker for precise timing without setTimeout
// Uses high-resolution timer and shared buffers

export interface WorkerMessage {
  type: 'start' | 'stop' | 'setBPM' | 'setSubdivisions' | 'setBeatsPerMeasure' | 'setBeatPattern' | 'tick';
  bpm?: number;
  subdivisions?: number;
  beats?: number;
  pattern?: string[];
  audioContextTime?: number;
}

export interface WorkerResponse {
  type: 'scheduled' | 'tick' | 'error';
  events?: ScheduledEvent[];
  beat?: number;
  subdivision?: number;
  error?: string;
}

export interface ScheduledEvent {
  time: number;
  level: 'accent' | 'normal' | 'subdivision';
  beat: number;
  subdivision: number;
}

class MetronomeWorker {
  private isRunning = false;
  private bpm = 120;
  private subdivisions = 1;
  private nextNoteTime = 0;
  private currentBeat = 1;
  private currentSubdivision = 1;
  private lookaheadTime = 0.025; // 25ms
  private scheduleInterval = 0.025; // 25ms
  private timerID: ReturnType<typeof setInterval> | null = null;

  private getBeatLength(): number {
    return 60.0 / this.bpm; // Length of one beat in seconds
  }

  private getSubdivisionLength(): number {
    return this.getBeatLength() / this.subdivisions;
  }

  private scheduler(): void {
    // Schedule all events within the lookahead time
    const events: ScheduledEvent[] = [];
    const currentTime = performance.now() / 1000; // Convert to seconds
    
    while (this.nextNoteTime < currentTime + this.lookaheadTime) {
      // Determine sound level
      let level: 'accent' | 'normal' | 'subdivision';
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

      // Advance to next subdivision
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
      postMessage({
        type: 'scheduled',
        events
      } as WorkerResponse);
    }

    // Send current position for UI updates
    postMessage({
      type: 'tick',
      beat: this.currentBeat,
      subdivision: this.currentSubdivision
    } as WorkerResponse);
  }

  private startTimer(): void {
    if (this.isRunning) {
      // Use setInterval instead of setTimeout for more consistent timing
      // Worker threads have better timer precision than main thread
      this.timerID = setInterval(() => {
        this.scheduler();
      }, this.scheduleInterval * 1000);
    }
  }

  start(audioContextTime: number): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.nextNoteTime = audioContextTime;
    this.currentBeat = 1;
    this.currentSubdivision = 1;
    this.startTimer();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timerID) {
      clearInterval(this.timerID);
      this.timerID = null;
    }
  }

  setBPM(bpm: number): void {
    this.bpm = Math.max(40, Math.min(240, bpm));
  }

  setSubdivisions(subdivisions: number): void {
    this.subdivisions = Math.max(1, Math.min(6, subdivisions));
  }

  handleMessage(data: WorkerMessage): void {
    try {
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
    } catch (error) {
      postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      } as WorkerResponse);
    }
  }
}

// Worker instance
const worker = new MetronomeWorker();

// Listen for messages from main thread
self.addEventListener('message', (e: MessageEvent<WorkerMessage>) => {
  worker.handleMessage(e.data);
});