export interface Note {
  pitch: string;
  frequency: number;
  midi: number;
  staffY: number; // Vertical position on staff (0 = bottom line E4)
}

export interface EngineState {
  isPlaying: boolean;
  p1Progress: number; // 0 to 1
  p2Progress: number; // 0 to 1
}

export enum PlayerColor {
  P1 = '#2563eb', // Blue-600
  P2 = '#dc2626', // Red-600
  Fusion = '#7e22ce', // Purple-700
}

export interface InstrumentConfig {
  id: string;
  name: string;
  oscillatorType: OscillatorType; // 'sine' | 'square' | 'sawtooth' | 'triangle'
  envelope: {
    attack: number;
    decay: number;
    sustain?: number;
    release?: number;
  };
  gainMulti: number;
}