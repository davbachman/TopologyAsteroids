export class RetroSynth {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private thrustSource: AudioBufferSourceNode | null = null;
  private thrustFilter: BiquadFilterNode | null = null;
  private thrustGain: GainNode | null = null;

  unlock(): void {
    const context = this.ensureContext();
    if (context.state === 'suspended') {
      void context.resume();
    }
  }

  onVisibilityChange(hidden: boolean): void {
    if (!this.context) {
      return;
    }

    if (hidden) {
      this.setThrust(false);
      if (this.context.state === 'running') {
        void this.context.suspend();
      }
      return;
    }

    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
  }

  setThrust(active: boolean): void {
    if (!this.context) {
      return;
    }

    this.ensureThrustLoop();
    if (!this.thrustGain) {
      return;
    }

    const now = this.context.currentTime;
    const target = active ? 0.08 : 0.0001;
    const decay = active ? 0.03 : 0.06;
    this.thrustGain.gain.setTargetAtTime(target, now, decay);
  }

  fire(): void {
    const context = this.context;
    const master = this.masterGain;
    if (!context || !master) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(910, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(320, context.currentTime + 0.07);

    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.08);

    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.09);
  }

  explosion(): void {
    const context = this.context;
    const master = this.masterGain;
    const noise = this.noiseBuffer;
    if (!context || !master || !noise) {
      return;
    }

    const source = context.createBufferSource();
    source.buffer = noise;

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1250;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.28, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    source.start(context.currentTime);
    source.stop(context.currentTime + 0.24);
  }

  beat(): void {
    const context = this.context;
    const master = this.masterGain;
    if (!context || !master) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(144, context.currentTime);

    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.055);

    oscillator.connect(gain);
    gain.connect(master);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.06);
  }

  private ensureContext(): AudioContext {
    if (this.context) {
      return this.context;
    }

    this.context = new AudioContext();

    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.6;

    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.18;

    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.context.destination);

    this.noiseBuffer = this.createNoiseBuffer(this.context);
    return this.context;
  }

  private createNoiseBuffer(context: AudioContext): AudioBuffer {
    const length = context.sampleRate * 2;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  private ensureThrustLoop(): void {
    if (!this.context || !this.masterGain || !this.noiseBuffer) {
      return;
    }

    if (this.thrustSource && this.thrustGain && this.thrustFilter) {
      return;
    }

    this.thrustSource = this.context.createBufferSource();
    this.thrustSource.buffer = this.noiseBuffer;
    this.thrustSource.loop = true;

    this.thrustFilter = this.context.createBiquadFilter();
    this.thrustFilter.type = 'bandpass';
    this.thrustFilter.frequency.value = 680;
    this.thrustFilter.Q.value = 1.6;

    this.thrustGain = this.context.createGain();
    this.thrustGain.gain.value = 0.0001;

    this.thrustSource.connect(this.thrustFilter);
    this.thrustFilter.connect(this.thrustGain);
    this.thrustGain.connect(this.masterGain);

    this.thrustSource.start();
  }
}
