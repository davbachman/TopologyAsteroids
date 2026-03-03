import type { Topology } from '../../topology/topology';
import { drawAsteroidWireframe, drawBulletWireframe, drawLifeShipIcon, drawShipWireframe, drawUfoWireframe } from './wireframes';
import type { GameState, Vec2 } from '../types';

export class CanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  readonly canvas: HTMLCanvasElement;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly topology: Topology,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.canvas = canvas;
    this.canvas.width = topology.worldWidth;
    this.canvas.height = topology.worldHeight;
  }

  render(state: GameState): void {
    this.renderScene(state);
    this.drawHud(state);
    this.drawOverlay(state);
  }

  /** Render only the game world (entities + boundary) — no HUD or overlay text. */
  renderWorldOnly(state: GameState): void {
    this.renderScene(state);
  }

  /**
   * Overlay faint, shifted copies of world entities.
   * Used by torus-mapping views to hint what appears on the far side of the surface.
   */
  renderShiftedEntityGhosts(
    state: GameState,
    shift: Vec2,
    alpha = 0.2,
    composite: GlobalCompositeOperation = 'screen',
  ): void {
    const { ctx } = this;
    const w = this.topology.worldWidth;
    const h = this.topology.worldHeight;

    ctx.save();
    if (this.topology.centered) {
      ctx.translate(w / 2, h / 2);
    }
    this.topology.buildClipPath(ctx);
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = composite;
    ctx.lineWidth = 1.75;
    ctx.strokeStyle = '#f5f5f5';
    this.drawEntitiesShifted(state, shift);
    ctx.restore();
  }

  private renderScene(state: GameState): void {
    const { ctx } = this;
    const w = this.topology.worldWidth;
    const h = this.topology.worldHeight;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    if (this.topology.centered) {
      ctx.translate(w / 2, h / 2);
    }

    this.drawWorld(state);
    this.topology.drawBoundary(ctx);

    ctx.restore();
  }

  private drawWorld(state: GameState): void {
    const { ctx } = this;

    ctx.save();
    this.topology.buildClipPath(ctx);
    ctx.clip();

    ctx.fillStyle = '#000';
    const s = this.topology.logicalSize;
    ctx.fillRect(-s, -s, s * 2, s * 2);

    this.topology.drawStars(ctx, state.time);

    ctx.lineWidth = 1.75;
    ctx.strokeStyle = '#f5f5f5';
    this.drawEntitiesShifted(state, { x: 0, y: 0 });

    ctx.restore();
  }

  private drawEntitiesShifted(state: GameState, shift: Vec2): void {
    const { ctx } = this;
    const shifted = (point: Vec2): Vec2 => {
      const mapped = { x: point.x + shift.x, y: point.y + shift.y };
      this.topology.wrapInPlace(mapped);
      return mapped;
    };

    for (const asteroid of state.asteroids) {
      const pos = shift.x === 0 && shift.y === 0 ? asteroid.pos : shifted(asteroid.pos);
      this.drawWrapped(pos, asteroid.radius + 3, (offset) => {
        ctx.save();
        ctx.translate(pos.x + offset.x, pos.y + offset.y);
        ctx.rotate(asteroid.angle);
        drawAsteroidWireframe(ctx, asteroid);
        ctx.restore();
      });
    }

    if (state.player.alive && this.isPlayerVisible(state)) {
      const pos = shift.x === 0 && shift.y === 0 ? state.player.pos : shifted(state.player.pos);
      this.drawWrapped(pos, state.player.radius + 3, (offset) => {
        ctx.save();
        ctx.translate(pos.x + offset.x, pos.y + offset.y);
        ctx.rotate(state.player.angle);
        drawShipWireframe(ctx, state.player.radius, state.player.thrusting);
        ctx.restore();
      });
    }

    for (const bullet of state.playerBullets) {
      const pos = shift.x === 0 && shift.y === 0 ? bullet.pos : shifted(bullet.pos);
      this.drawWrapped(pos, bullet.radius + 1, (offset) => {
        ctx.save();
        ctx.translate(pos.x + offset.x, pos.y + offset.y);
        drawBulletWireframe(ctx, bullet.radius);
        ctx.restore();
      });
    }

    for (const bullet of state.ufoBullets) {
      const pos = shift.x === 0 && shift.y === 0 ? bullet.pos : shifted(bullet.pos);
      this.drawWrapped(pos, bullet.radius + 1, (offset) => {
        ctx.save();
        ctx.translate(pos.x + offset.x, pos.y + offset.y);
        drawBulletWireframe(ctx, bullet.radius);
        ctx.restore();
      });
    }

    if (state.ufo?.alive) {
      const pos = shift.x === 0 && shift.y === 0 ? state.ufo.pos : shifted(state.ufo.pos);
      this.drawWrapped(pos, state.ufo.radius + 3, (offset) => {
        ctx.save();
        ctx.translate(pos.x + offset.x, pos.y + offset.y);
        drawUfoWireframe(ctx, state.ufo!);
        ctx.restore();
      });
    }
  }

  private drawHud(state: GameState): void {
    const { ctx } = this;
    const w = this.topology.worldWidth;
    const h = this.topology.worldHeight;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#f5f5f5';
    ctx.strokeStyle = '#f5f5f5';
    ctx.font = '18px "Courier New", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(`SCORE ${String(state.score).padStart(5, '0')}`, 18, 14);
    ctx.fillText(`WAVE ${state.wave}`, w - 130, 14);

    const livesToDraw = Math.max(0, state.lives - (state.player.alive ? 1 : 0));
    ctx.fillText('LIVES', 18, h - 36);
    ctx.save();
    ctx.translate(84, h - 24);
    for (let i = 0; i < livesToDraw; i += 1) {
      ctx.save();
      ctx.translate(i * 24, 0);
      drawLifeShipIcon(ctx, 8);
      ctx.restore();
    }
    ctx.restore();

    if (state.audio.muted) {
      ctx.fillText('MUTED', w - 92, h - 36);
    }
    if (!state.audio.unlocked) {
      ctx.fillText('CLICK OR PRESS A KEY FOR AUDIO', w / 2 - 140, h - 36);
    }

    if (state.mode === 'paused') {
      ctx.fillText('PAUSED', w / 2 - 36, 14);
    }
    ctx.restore();
  }

  private drawOverlay(state: GameState): void {
    if (state.mode === 'playing' || state.mode === 'respawning') return;
    const { ctx } = this;
    const w = this.topology.worldWidth;
    const h = this.topology.worldHeight;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#f5f5f5';
    ctx.font = '30px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (state.mode === 'start' || state.mode === 'boot') {
      ctx.fillText(this.topology.displayName, w / 2, h / 2 - 80);
      ctx.font = '16px "Courier New", monospace';
      const lines = [
        'ENTER START   P PAUSE   F FULLSCREEN   M MUTE',
        'ARROWS / A D W TO ROTATE / THRUST   SPACE FIRE',
        'SHIFT HYPERSPACE   ESC MENU',
      ];
      lines.forEach((line, index) => ctx.fillText(line, w / 2, h / 2 - 18 + index * 26));
      ctx.fillText('PRESS ENTER', w / 2, h / 2 + 86);
    }

    if (state.mode === 'gameOver') {
      ctx.fillText('GAME OVER', w / 2, h / 2 - 30);
      ctx.font = '18px "Courier New", monospace';
      ctx.fillText(`FINAL SCORE ${state.score}`, w / 2, h / 2 + 8);
      ctx.fillText('PRESS ENTER TO RESTART', w / 2, h / 2 + 46);
    }

    ctx.restore();
  }

  private isPlayerVisible(state: GameState): boolean {
    if (state.player.invulnerableTimer <= 0) return true;
    return Math.floor(state.player.blinkPhase) % 2 === 0;
  }

  private drawWrapped(point: Vec2, radius: number, draw: (offset: Vec2) => void): void {
    const offsets = this.topology.getGhostOffsets(point, radius);
    for (const offset of offsets) draw(offset);
  }
}
