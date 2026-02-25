import { AudioEngine } from './audioEngine';
import type { AudioEvent } from '../types';

export function drainAudioEvents(engine: AudioEngine, events: AudioEvent[]): void {
  for (const event of events) {
    engine.playEvent(event.name);
  }
  events.length = 0;
}
