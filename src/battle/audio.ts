import { DRUMS } from '../data/battlefield';

/** 全部音效都係 WebAudio 即時合成，唔用音檔 */
export class Sfx {
  private drumTimer = 0;
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, len);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    void this.ctx.resume();
  }

  private burst(freq: number, q: number, gain: number, dur: number, type: BiquadFilterType = 'bandpass') {
    const ctx = this.ctx;
    if (!ctx || this.muted || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(0, Math.random() * 0.8, dur);
  }

  private tone(freq: number, gain: number, dur: number, type: OscillatorType) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  hit(kill: boolean) {
    this.burst(kill ? 420 : 620, 0.9, kill ? 0.55 : 0.35, 0.16);
    this.tone(kill ? 110 : 150, kill ? 0.4 : 0.2, 0.16, 'sine');
  }

  clash() {
    this.tone(1700, 0.09, 0.14, 'triangle');
    this.tone(2600, 0.06, 0.1, 'square');
    this.burst(3200, 2, 0.2, 0.08);
  }

  thud() {
    this.tone(85, 0.5, 0.22, 'sine');
    this.burst(260, 1, 0.3, 0.14);
  }

  whoosh() {
    this.burst(1100, 0.7, 0.13, 0.17);
  }

  arrow() {
    this.burst(2200, 3, 0.1, 0.1);
  }

  boom() {
    this.tone(70, 0.6, 0.4, 'sine');
    this.burst(320, 0.7, 0.5, 0.35);
  }

  ui() {
    this.tone(880, 0.05, 0.06, 'triangle');
  }

  /** 勝負音：上行三和弦或者下行 */
  fanfare(win: boolean) {
    const notes = win ? [392, 494, 587, 784] : [392, 330, 262];
    notes.forEach((f, i) => window.setTimeout(() => this.tone(f, 0.16, 0.45, 'triangle'), i * 170));
  }

  /** 戰鼓：暫停時停 */
  drums(on: boolean, playing: () => boolean = () => true) {
    window.clearInterval(this.drumTimer);
    if (!on) return;
    let i = 0;
    this.drumTimer = window.setInterval(() => {
      const hit = DRUMS.pattern[i++ % DRUMS.pattern.length];
      if (hit && playing()) this.tone(DRUMS.freq, DRUMS.gain * hit, DRUMS.decay, 'sine');
    }, DRUMS.stepMs);
  }

  hoof(strength: number) {
    this.burst(180, 1.2, 0.06 + strength * 0.1, 0.07, 'lowpass');
  }
}
