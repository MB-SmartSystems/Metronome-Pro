export interface MetronomeState {
  isPlaying: boolean;
  bpm: number;
  subdivisions: number;
  currentBeat: number;
  currentSubdivision: number;
  soundType: SoundType;
}

export type SoundType = 'click' | 'clave';

export type SoundLevel = 'accent' | 'normal' | 'subdivision';

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
  start(): void;
  stop(): void;
  setBPM(bpm: number): void;
  setSubdivisions(subdivisions: number): void;
  setSoundType(type: SoundType): void;
  getState(): MetronomeState;
}