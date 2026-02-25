export function attachAdvanceTime(stepByMs: (ms: number) => void): void {
  window.advanceTime = (ms: number) => {
    stepByMs(ms);
  };
}
