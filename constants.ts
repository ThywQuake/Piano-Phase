import { Note } from './types';

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