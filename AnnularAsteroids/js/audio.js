let ctx = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return ctx;
}

function playTone(freq, duration, type = 'square', volume = 0.15, freqEnd = null) {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  if (freqEnd !== null) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ac.currentTime + duration);
  }
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

function playNoise(duration, volume = 0.1) {
  const ac = getCtx();
  const bufferSize = ac.sampleRate * duration;
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ac.createBufferSource();
  source.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  source.connect(gain);
  gain.connect(ac.destination);
  source.start();
}

export function playFire() {
  playTone(800, 0.1, 'square', 0.1, 200);
}

export function playThrust() {
  playNoise(0.08, 0.04);
}

export function playExplosionSmall() {
  playNoise(0.2, 0.15);
  playTone(150, 0.2, 'sawtooth', 0.08, 40);
}

export function playExplosionLarge() {
  playNoise(0.4, 0.25);
  playTone(80, 0.4, 'sawtooth', 0.12, 20);
}

export function playShipDeath() {
  playNoise(0.6, 0.3);
  playTone(400, 0.6, 'sawtooth', 0.15, 30);
}

export function resumeAudio() {
  const ac = getCtx();
  if (ac.state === 'suspended') {
    ac.resume();
  }
}
