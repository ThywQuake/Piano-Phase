import { MELODY } from '../constants';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private nextNoteTime1: number = 0;
  private nextNoteTime2: number = 0;
  private noteIndex1: number = 0;
  private noteIndex2: number = 0;
  private timerID: number | null = null;
  
  // Phasing parameters
  private bpm: number = 280; // Default BPM
  private cyclesToPhase: number = 40;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private totalOffset: number = 0;

  constructor() {
    // Lazy init in start()
  }

  public getBpm(): number {
    return this.bpm;
  }

  public setBpm(newBpm: number) {
    if (newBpm <= 0) return;
    
    // If playing or paused, we need to adjust anchors to prevent jumping
    if (this.ctx) {
        // 1. Calculate current progress
        const currentState = this.getCurrentState(); // { p1, p2 }
        const p1 = currentState.p1;
        
        // 2. Update BPM
        this.bpm = newBpm;
        
        // 3. Re-calculate startTime so that visual progress remains exactly p1
        // p1 = (elapsed % loopDur) / loopDur
        // We want (effectiveNow - newStartTime) % newLoopDur = p1 * newLoopDur
        // To simplify, we reset the "epoch" to match exactly the current progress
        
        const newLoopDur = this.getLoopDuration();
        const now = this.ctx.currentTime;
        const effectiveNow = this.isPlaying ? now : this.pauseTime;
        
        // We set a new start time such that effectiveNow is exactly `p1 * newLoopDur` into a loop
        // We effectively discard previous totalOffset history and re-anchor
        this.startTime = effectiveNow - (p1 * newLoopDur);
        this.totalOffset = 0;
    } else {
        this.bpm = newBpm;
    }
  }

  public getLoopDuration(): number {
    const secondsPerBeat = 60.0 / this.bpm;
    return secondsPerBeat * MELODY.length;
  }

  public setCyclesToPhase(cycles: number) {
    this.cyclesToPhase = cycles;
  }

  private initAudioContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public async start() {
    this.initAudioContext();
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
    
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.noteIndex1 = 0;
    this.noteIndex2 = 0;
    
    // Handle resume vs fresh start
    const now = this.ctx!.currentTime;
    if (this.pauseTime > 0) {
      this.totalOffset += (now - this.pauseTime);
    } else {
      this.startTime = now;
      this.totalOffset = 0;
      this.nextNoteTime1 = now + 0.1;
      this.nextNoteTime2 = now + 0.1;
    }
    this.pauseTime = 0;

    this.scheduler();
  }

  public pause() {
    this.isPlaying = false;
    if (this.timerID !== null) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
    if (this.ctx) {
      this.pauseTime = this.ctx.currentTime;
    }
  }

  public reset() {
    this.pause();
    this.pauseTime = 0;
    this.totalOffset = 0;
    this.startTime = 0;
    this.noteIndex1 = 0;
    this.noteIndex2 = 0;
  }

  private scheduler = () => {
    if (!this.isPlaying || !this.ctx) return;

    // Lookahead: 100ms
    const scheduleAheadTime = 0.1;

    while (this.nextNoteTime1 < this.ctx.currentTime + scheduleAheadTime) {
      this.scheduleNote(1, this.nextNoteTime1, this.noteIndex1);
      this.nextNote();
    }

    while (this.nextNoteTime2 < this.ctx.currentTime + scheduleAheadTime) {
      this.scheduleNote(2, this.nextNoteTime2, this.noteIndex2);
      this.nextNote2();
    }

    this.timerID = window.setTimeout(this.scheduler, 25);
  };

  private scheduleNote(voice: number, time: number, index: number) {
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const note = MELODY[index % MELODY.length];
    
    osc.frequency.value = note.frequency;
    
    // Simple envelope
    // Voice 1: Panned Left-ish, Voice 2: Panned Right-ish
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = voice === 1 ? -0.3 : 0.3;

    osc.connect(panner);
    panner.connect(gain);
    gain.connect(this.ctx.destination);

    // Click-free envelope
    const attack = 0.01;
    const decay = 0.15;
    
    osc.start(time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(voice === 1 ? 0.4 : 0.4, time + attack); 
    gain.gain.exponentialRampToValueAtTime(0.001, time + attack + decay);
    osc.stop(time + attack + decay + 0.1);
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime1 += secondsPerBeat;
    this.noteIndex1++;
  }

  private nextNote2() {
    const secondsPerBeat = 60.0 / this.bpm;
    const phaseFactor = this.cyclesToPhase / (this.cyclesToPhase + 1);
    const duration2 = secondsPerBeat * phaseFactor;
    
    this.nextNoteTime2 += duration2;
    this.noteIndex2++;
  }

  // Used for UI synchronization
  public getCurrentState() {
    if (!this.ctx) return { p1: 0, p2: 0 };
    
    const now = this.ctx.currentTime;
    const effectiveNow = this.isPlaying ? now : this.pauseTime;
    const elapsed = Math.max(0, effectiveNow - (this.startTime + this.totalOffset));

    const secondsPerBeat = 60.0 / this.bpm;
    const loopDuration1 = secondsPerBeat * MELODY.length;
    
    const phaseFactor = this.cyclesToPhase / (this.cyclesToPhase + 1);
    const loopDuration2 = loopDuration1 * phaseFactor;

    const p1 = (elapsed % loopDuration1) / loopDuration1;
    const p2 = (elapsed % loopDuration2) / loopDuration2;

    return { p1, p2 };
  }
}

export const soundEngine = new SoundEngine();