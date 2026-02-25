import type { AudioEventName, AudioState, UfoType } from '../types';

const DEFAULT_AUDIO_STATE: AudioState = { unlocked: false, muted: false };
const MASTER_GAIN_VALUE = 0.62;

type AudioContextCtor = new () => AudioContext;

function getAudioContextCtor(): AudioContextCtor | undefined {
  const w = window as Window & typeof globalThis & { webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private thrustOsc: OscillatorNode | null = null;
  private thrustGain: GainNode | null = null;
  private ufoOsc: OscillatorNode | null = null;
  private ufoGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private heartbeatTimer = 0;
  private readonly state: AudioState = { ...DEFAULT_AUDIO_STATE };

  getState(): AudioState {
    return { ...this.state };
  }

  async unlock(): Promise<void> {
    try {
      this.ensureContext();
      if (!this.ctx) return;
      if (this.ctx.state !== 'running') {
        await this.ctx.resume();
      }
      this.state.unlocked = this.ctx.state === 'running';
      if (this.state.unlocked) {
        this.ensureContinuousNodes();
        this.heartbeatTimer = 0;
        this.applyMute();
      }
    } catch (error) {
      this.state.unlocked = false;
      console.warn('Audio unlock failed', error);
    }
  }

  shutdown(): void {
    this.setThrust(false);
    this.setUfoHum(false, 'large');
    this.thrustOsc?.disconnect();
    this.ufoOsc?.disconnect();
    this.thrustGain?.disconnect();
    this.ufoGain?.disconnect();
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.thrustOsc = null;
    this.thrustGain = null;
    this.ufoOsc = null;
    this.ufoGain = null;
    this.noiseBuffer = null;
    this.state.unlocked = false;
  }

  toggleMute(): void {
    this.state.muted = !this.state.muted;
    this.applyMute();
  }

  setThrust(active: boolean): void {
    if (!this.state.unlocked) return;
    this.ensureContinuousNodes();
    if (!this.ctx || !this.thrustGain || !this.thrustOsc) return;
    const now = this.ctx.currentTime;
    this.thrustGain.gain.cancelScheduledValues(now);
    this.thrustGain.gain.setTargetAtTime(active && !this.state.muted ? 0.11 : 0.00001, now, 0.02);
    this.thrustOsc.frequency.setTargetAtTime(active ? 95 : 70, now, 0.04);
  }

  setUfoHum(active: boolean, type: UfoType): void {
    if (!this.state.unlocked) return;
    this.ensureContinuousNodes();
    if (!this.ctx || !this.ufoGain || !this.ufoOsc) return;
    const now = this.ctx.currentTime;
    this.ufoGain.gain.cancelScheduledValues(now);
    this.ufoGain.gain.setTargetAtTime(active && !this.state.muted ? (type === 'large' ? 0.075 : 0.055) : 0.00001, now, 0.03);
    this.ufoOsc.frequency.setTargetAtTime(type === 'large' ? 120 : 210, now, 0.1);
  }

  tickHeartbeat(dt: number, asteroidCount: number): void {
    if (!this.state.unlocked || this.state.muted) return;
    const interval = asteroidCount <= 0 ? 1.6 : Math.max(0.22, 1.05 - Math.min(0.85, asteroidCount * 0.06));
    this.heartbeatTimer -= dt;
    if (this.heartbeatTimer > 0) return;
    this.heartbeatTimer = interval;
    this.playPulse();
  }

  playEvent(name: AudioEventName): void {
    if (!this.state.unlocked || this.state.muted) return;
    switch (name) {
      case 'playerFire':
        this.beep({ type: 'square', frequency: 660, duration: 0.05, gain: 0.085, slideTo: 440 });
        break;
      case 'asteroidExplosionLarge':
        this.noiseBurst(0.16, 0.16, 220);
        break;
      case 'asteroidExplosionMedium':
        this.noiseBurst(0.12, 0.11, 350);
        break;
      case 'asteroidExplosionSmall':
        this.noiseBurst(0.08, 0.08, 520);
        break;
      case 'shipDeath':
        this.beep({ type: 'sawtooth', frequency: 320, duration: 0.28, gain: 0.11, slideTo: 45 });
        this.noiseBurst(0.22, 0.09, 1400);
        break;
      case 'ufoFire':
        this.beep({ type: 'triangle', frequency: 430, duration: 0.07, gain: 0.075, slideTo: 250 });
        break;
      case 'hyperspace':
        this.beep({ type: 'sine', frequency: 240, duration: 0.22, gain: 0.095, slideTo: 1200 });
        break;
      case 'extraLife':
        this.beep({ type: 'square', frequency: 660, duration: 0.08, gain: 0.085, slideTo: 880 });
        this.beep({ type: 'square', frequency: 880, duration: 0.1, gain: 0.085, delay: 0.09, slideTo: 1320 });
        break;
      case 'gameOver':
        this.beep({ type: 'triangle', frequency: 280, duration: 0.25, gain: 0.105, slideTo: 160, delay: 0.0 });
        this.beep({ type: 'triangle', frequency: 220, duration: 0.28, gain: 0.105, slideTo: 90, delay: 0.2 });
        break;
    }
  }

  private ensureContext(): void {
    if (this.ctx) return;
    const Ctor = getAudioContextCtor();
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = MASTER_GAIN_VALUE;
    this.master.connect(this.ctx.destination);
    this.noiseBuffer = this.buildNoiseBuffer();
  }

  private ensureContinuousNodes(): void {
    this.ensureContext();
    if (!this.ctx || !this.master) return;

    if (!this.thrustOsc || !this.thrustGain) {
      this.thrustOsc = this.ctx.createOscillator();
      this.thrustGain = this.ctx.createGain();
      this.thrustOsc.type = 'sawtooth';
      this.thrustOsc.frequency.value = 75;
      this.thrustGain.gain.value = 0.00001;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 380;
      this.thrustOsc.connect(filter);
      filter.connect(this.thrustGain);
      this.thrustGain.connect(this.master);
      this.thrustOsc.start();
    }

    if (!this.ufoOsc || !this.ufoGain) {
      this.ufoOsc = this.ctx.createOscillator();
      this.ufoGain = this.ctx.createGain();
      this.ufoOsc.type = 'triangle';
      this.ufoOsc.frequency.value = 120;
      this.ufoGain.gain.value = 0.00001;
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 4;
      lfoGain.gain.value = 8;
      lfo.connect(lfoGain);
      lfoGain.connect(this.ufoOsc.frequency);
      this.ufoOsc.connect(this.ufoGain);
      this.ufoGain.connect(this.master);
      this.ufoOsc.start();
      lfo.start();
    }
  }

  private applyMute(): void {
    if (!this.master) return;
    this.master.gain.value = this.state.muted ? 0 : MASTER_GAIN_VALUE;
  }

  private buildNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const duration = 0.5;
    const length = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private beep(options: {
    type: OscillatorType;
    frequency: number;
    duration: number;
    gain: number;
    slideTo?: number;
    delay?: number;
  }): void {
    this.ensureContext();
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = options.type;
    const start = this.ctx.currentTime + (options.delay ?? 0);
    const end = start + options.duration;
    osc.frequency.setValueAtTime(options.frequency, start);
    if (typeof options.slideTo === 'number') {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.slideTo), end);
    }
    gain.gain.setValueAtTime(0.00001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, options.gain), start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.00001, end);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(start);
    osc.stop(end + 0.03);
  }

  private noiseBurst(duration: number, gainValue: number, lowpassFreq: number): void {
    this.ensureContext();
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpassFreq;
    const start = this.ctx.currentTime;
    const end = start + duration;
    gain.gain.setValueAtTime(Math.max(0.0001, gainValue), start);
    gain.gain.exponentialRampToValueAtTime(0.00001, end);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(start);
    source.stop(end);
  }

  private playPulse(): void {
    this.beep({ type: 'square', frequency: 110, duration: 0.07, gain: 0.08, slideTo: 90 });
  }
}
