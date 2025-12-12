import { Note, InstrumentConfig} from './types';

// Melody: E4 F#4 B4 C#5 D5 F#4 E4 C#5 B4 F#4 D5 C#5
// Staff Y Reference: E4 = 0 (line 1), F4 = 1 (space 1), etc.
export const MELODY: Note[] = [
  { pitch: 'E4', frequency: 329.63, midi: 64, staffY: 0 },
  { pitch: 'F#4', frequency: 369.99, midi: 66, staffY: 1 },
  { pitch: 'B4', frequency: 493.88, midi: 71, staffY: 4 },
  { pitch: 'C#5', frequency: 554.37, midi: 73, staffY: 5 },
  { pitch: 'D5', frequency: 587.33, midi: 74, staffY: 6 },
  { pitch: 'F#4', frequency: 369.99, midi: 66, staffY: 1 },
  { pitch: 'E4', frequency: 329.63, midi: 64, staffY: 0 },
  { pitch: 'C#5', frequency: 554.37, midi: 73, staffY: 5 },
  { pitch: 'B4', frequency: 493.88, midi: 71, staffY: 4 },
  { pitch: 'F#4', frequency: 369.99, midi: 66, staffY: 1 },
  { pitch: 'D5', frequency: 587.33, midi: 74, staffY: 6 },
  { pitch: 'C#5', frequency: 554.37, midi: 73, staffY: 5 },
];

export const NOTE_COUNT = MELODY.length;
export const GROUP_SIZE = 6; // Beaming group size

export const INSTRUMENTS: InstrumentConfig[] = [
  {
    id: 'piano',
    name: 'Electric Piano',
    oscillatorType: 'triangle', // Closed to a piano's harmonic profile
    envelope: { attack: 0.01, decay: 0.15 },
    gainMulti: 0.8
  },
  {
    id: 'marimba',
    name: 'Marimba',
    oscillatorType: 'sine', // Closed to marimba's mellow tone
    envelope: { attack: 0.005, decay: 0.1 },
    gainMulti: 1.0
  },
  {
    id: 'violin_pizz',
    name: 'Violin (Pizz)',
    oscillatorType: 'sawtooth', // Bright and rich, similar to a violin pizzicato
    envelope: { attack: 0.01, decay: 0.2 },
    gainMulti: 0.25 // Sawtooth waves have a lot of energy, so volume is reduced
  },
  {
    id: 'clarinet',
    name: 'Clarinet',
    oscillatorType: 'square', // Warm and woody, akin to a clarinet's tone
    envelope: { attack: 0.02, decay: 0.15 },
    gainMulti: 0.3
  }
];