export interface MetronomeState {
  isPlaying: boolean;
  bpm: number;
  subdivisions: number;
  beatsPerMeasure: number;
  currentBeat: number;
  currentSubdivision: number;
  soundType: SoundType;
  accentColor: AccentColor;
  beatPattern: BeatLevel[];
}

export type SoundType = 'click' | 'clave';

export type SoundLevel = 'accent' | 'normal' | 'subdivision';

export type BeatLevel = 'accent' | 'normal' | 'muted';

export type AccentColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'pink' | 'cyan';

export interface AudioConfig {
  sampleRate: number;
  bufferSize: number;
  lookaheadTime: number; // 25ms
  scheduleInterval: number; // 25ms
}

export interface SoundEvent {
  time: number;
  level: SoundLevel;
  beat: number;
  subdivision: number;
}

export interface AudioBufferPool {
  accent: AudioBuffer;
  normal: AudioBuffer;
  subdivision: AudioBuffer;
}

export interface MetronomeEngine {
  start(): Promise<void>;
  stop(): void;
  setBPM(bpm: number): void;
  setSubdivisions(subdivisions: number): void;
  setBeatsPerMeasure(beats: number): void;
  setSoundType(type: SoundType): void;
  setAccentColor(color: AccentColor): void;
  setBeatLevel(beatIndex: number, level: BeatLevel): void;
  getState(): MetronomeState;
}