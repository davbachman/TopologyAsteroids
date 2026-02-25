export class FixedStepLoop {
  private accumulator = 0;
  private lastTimestamp = 0;
  private rafId = 0;
  private running = false;

  constructor(
    private readonly fixedDt: number,
    private readonly update: (dt: number) => void,
    private readonly render: () => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this.onFrame);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  stepByMs(ms: number): void {
    const stepMs = this.fixedDt * 1000;
    const steps = Math.max(1, Math.round(ms / stepMs));
    for (let i = 0; i < steps; i += 1) this.update(this.fixedDt);
    this.render();
  }

  private onFrame = (timestamp: number): void => {
    if (!this.running) return;
    const deltaSec = Math.min(0.25, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;
    this.accumulator += deltaSec;

    while (this.accumulator >= this.fixedDt) {
      this.update(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    this.render();
    this.rafId = requestAnimationFrame(this.onFrame);
  };
}
