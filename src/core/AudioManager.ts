/**
 * Áudio 100% sintetizado em tempo real (WebAudio): efeitos sonoros e músicas originais em estilo chiptune.
 * Não depende de arquivos externos. O contexto de áudio só é criado após um gesto do usuário.
 */
type Track = 'title' | 'campus' | 'clinic' | 'lab' | 'case';

interface Song {
  bpm: number;
  lead: OscillatorType;
  leadVol: number;
  /** melodia em colcheias (MIDI ou null = pausa); comprimento múltiplo de 8 */
  melody: (number | null)[];
  /** baixo: uma nota por tempo (semínima) */
  bass: (number | null)[];
  pad?: (number | null)[];
}

// Composições originais (progressões simples e arpejos).
const SONGS: Record<Track, Song> = {
  title: {
    bpm: 104, lead: 'square', leadVol: 0.05,
    melody: [72, null, 76, 79, 81, null, 79, 76, 74, null, 76, 77, 79, null, null, null, 76, null, 79, 84, 83, null, 81, 79, 77, 76, 74, 76, 72, null, null, null],
    bass: [48, 55, 48, 55, 50, 57, 55, 50, 53, 60, 52, 59, 50, 55, 48, null],
  },
  campus: {
    bpm: 116, lead: 'square', leadVol: 0.035,
    melody: [64, 67, 72, 67, 64, 67, 69, 67, 62, 67, 71, 67, 62, 67, 71, 74, 60, 64, 69, 64, 60, 64, 67, 64, 65, 69, 72, 69, 67, 65, 64, 62],
    bass: [48, null, 55, null, 43, null, 50, null, 45, null, 52, null, 41, null, 48, null],
  },
  clinic: {
    bpm: 88, lead: 'triangle', leadVol: 0.07,
    melody: [77, null, 72, null, 74, 76, 77, null, 79, null, 74, null, 72, null, null, null, 76, null, 72, 69, 70, null, 72, null, 74, 72, 70, 69, 67, null, null, null],
    bass: [41, 48, 41, 48, 43, 50, 43, 50, 45, 52, 46, 53, 48, 55, 48, null],
  },
  lab: {
    bpm: 96, lead: 'triangle', leadVol: 0.06,
    melody: [62, 65, 69, 72, 71, null, 69, null, 67, 69, 65, null, 64, null, 62, null, 62, 65, 69, 74, 72, null, 71, 69, 67, null, 69, 71, 72, null, null, null],
    bass: [38, null, 45, null, 43, null, 38, null, 36, null, 43, null, 45, null, 45, null],
  },
  case: {
    bpm: 100, lead: 'sine', leadVol: 0.06,
    melody: [69, null, null, 72, 71, null, 69, null, 64, null, null, 67, 69, null, null, null, 65, null, null, 69, 67, null, 65, null, 64, null, 62, null, 64, null, null, null],
    bass: [45, 45, 45, 45, 41, 41, 43, 43, 45, 45, 45, 45, 40, 40, 44, 44],
  },
};

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private current: Track | null = null;
  private wanted: Track | null = null;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  musicVolume = 0.5;
  sfxVolume = 0.7;

  /** Pausa o áudio com a aba oculta (economiza bateria em celulares). */
  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.visibilityState === 'hidden') void this.ctx.suspend();
        else void this.ctx.resume();
      });
    }
  }

  /** Deve ser chamado em resposta a um gesto do usuário. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.setVolumes(this.musicVolume, this.sfxVolume);
    if (this.wanted) this.play(this.wanted);
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    if (!this.ctx) return;
    this.musicGain.gain.setTargetAtTime(music, this.ctx.currentTime, 0.05);
    this.sfxGain.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.02);
  }

  play(track: Track): void {
    this.wanted = track;
    if (!this.ctx || this.current === track) return;
    this.stopMusic();
    this.current = track;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 50);
  }

  stopMusic(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.current = null;
  }

  private schedule(): void {
    if (!this.ctx || !this.current) return;
    const song = SONGS[this.current];
    const eighth = 60 / song.bpm / 2;
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      const m = song.melody[this.step % song.melody.length];
      if (m !== null) this.note(midiToFreq(m), this.nextTime, eighth * 0.9, song.lead, song.leadVol, this.musicGain);
      if (this.step % 2 === 0) {
        const b = song.bass[(this.step / 2) % song.bass.length];
        if (b !== null) this.note(midiToFreq(b), this.nextTime, eighth * 1.8, 'triangle', 0.09, this.musicGain);
      }
      this.nextTime += eighth;
      this.step++;
    }
  }

  private note(freq: number, t: number, dur: number, type: OscillatorType, vol: number, dest: AudioNode, slideTo?: number): void {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  sfx(name: 'blip' | 'select' | 'confirm' | 'cancel' | 'error' | 'door' | 'bump' | 'levelup' | 'success' | 'unlock' | 'page' | 'step'): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const d = this.sfxGain;
    switch (name) {
      case 'blip': this.note(880, t, 0.03, 'square', 0.03, d); break;
      case 'select': this.note(660, t, 0.05, 'square', 0.05, d); break;
      case 'confirm': this.note(660, t, 0.06, 'square', 0.06, d); this.note(990, t + 0.06, 0.08, 'square', 0.06, d); break;
      case 'cancel': this.note(440, t, 0.06, 'square', 0.05, d); this.note(330, t + 0.06, 0.08, 'square', 0.05, d); break;
      case 'error': this.note(180, t, 0.18, 'sawtooth', 0.05, d, 120); break;
      case 'bump': this.note(110, t, 0.07, 'square', 0.04, d); break;
      case 'door': this.note(300, t, 0.12, 'triangle', 0.1, d, 150); this.note(220, t + 0.1, 0.12, 'triangle', 0.08, d, 110); break;
      case 'page': this.note(1200, t, 0.04, 'triangle', 0.04, d, 800); break;
      case 'step': this.note(90, t, 0.03, 'triangle', 0.03, d); break;
      case 'unlock': [784, 988, 1175].forEach((f, i) => this.note(f, t + i * 0.07, 0.1, 'square', 0.05, d)); break;
      case 'success': [523, 659, 784, 1047].forEach((f, i) => this.note(f, t + i * 0.09, 0.14, 'square', 0.05, d)); break;
      case 'levelup': [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.note(f, t + i * 0.1, 0.16, 'square', 0.06, d)); break;
    }
  }
}
