import { R_MIN, R_MAX, R_RANGE, DISPLAY_SCALE, SHIP_SIZE } from './constants.js';
import { rtToXY } from './coordinateTransform.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cx = canvas.width / 2;
    this.cy = canvas.height / 2;
    this.scale = DISPLAY_SCALE;
  }

  clear() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawAnnulusBackground() {
    const ctx = this.ctx;

    // Fill inner hole with dark gray
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, R_MIN * this.scale, 0, Math.PI * 2);
    ctx.fillStyle = '#222';
    ctx.fill();

    // Fill outside the outer ring — draw full canvas rect then cut out the circle
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.canvas.width, this.canvas.height);
    ctx.arc(this.cx, this.cy, R_MAX * this.scale, 0, Math.PI * 2, true);
    ctx.fillStyle = '#222';
    ctx.fill();
    ctx.restore();
  }

  beginAnnulusClip() {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, R_MAX * this.scale, 0, Math.PI * 2);
    ctx.arc(this.cx, this.cy, R_MIN * this.scale, 0, Math.PI * 2, true);
    ctx.clip();
  }

  endAnnulusClip() {
    this.ctx.restore();
  }

  // Draw an entity at its actual position plus ghost copies shifted by ±R_RANGE.
  // The annulus clip hides anything outside the ring, so ghosts only show
  // the wrapped portion that peeks in from the opposite boundary.
  // Skip ghosts with negative r — negative r flips 180° in polar coords.
  drawEntityWrapped(entity, color = '#fff', lineWidth = 1.5) {
    const origR = entity.r;
    this.drawEntity(entity, color, lineWidth);
    for (const offset of [-R_RANGE, R_RANGE]) {
      const ghostR = origR + offset;
      if (ghostR < 0) continue;
      entity.r = ghostR;
      this.drawEntity(entity, color, lineWidth);
    }
    entity.r = origR;
  }

  drawShipWrapped(ship) {
    if (!ship.alive) return;
    if (ship.invulnTimer > 0 && Math.floor(ship.invulnTimer * 10) % 2 === 0) return;
    const origR = ship.r;
    this.drawEntity(ship, '#fff', 1.5);
    if (ship.thrusting) this.drawThrustFlame(ship);
    for (const offset of [-R_RANGE, R_RANGE]) {
      const ghostR = origR + offset;
      if (ghostR < 0) continue;
      ship.r = ghostR;
      this.drawEntity(ship, '#fff', 1.5);
      if (ship.thrusting) this.drawThrustFlame(ship);
    }
    ship.r = origR;
  }

  drawBulletWrapped(bullet) {
    if (!bullet.alive) return;
    const origR = bullet.r;
    this.drawBullet(bullet);
    for (const offset of [-R_RANGE, R_RANGE]) {
      const ghostR = origR + offset;
      if (ghostR < 0) continue;
      bullet.r = ghostR;
      this.drawBullet(bullet);
    }
    bullet.r = origR;
  }

  drawParticleWrapped(particle) {
    if (!particle.alive) return;
    const origR = particle.r;
    this.drawParticle(particle);
    for (const offset of [-R_RANGE, R_RANGE]) {
      const ghostR = origR + offset;
      if (ghostR < 0) continue;
      particle.r = ghostR;
      this.drawParticle(particle);
    }
    particle.r = origR;
  }

  drawEntity(entity, color = '#fff', lineWidth = 1.5) {
    const verts = entity.getDisplayVertices(this.cx, this.cy, this.scale);
    if (verts.length === 0) return;

    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) {
      ctx.lineTo(verts[i].x, verts[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  drawShip(ship) {
    if (!ship.alive) return;
    if (ship.invulnTimer > 0 && Math.floor(ship.invulnTimer * 10) % 2 === 0) return;
    this.drawEntity(ship, '#fff', 1.5);

    if (ship.thrusting) {
      this.drawThrustFlame(ship);
    }
  }

  drawThrustFlame(ship) {
    const s = SHIP_SIZE;
    const flameLength = s * (0.5 + Math.random() * 0.3);
    const h = ship.heading;

    const flameTip = {
      dr: -flameLength * Math.cos(h),
      dt: -flameLength * Math.sin(h) / ship.r
    };
    const flameLeft = {
      dr: -s * 0.3 * Math.cos(h) + s * 0.2 * Math.cos(h + Math.PI / 2),
      dt: (-s * 0.3 * Math.sin(h) + s * 0.2 * Math.sin(h + Math.PI / 2)) / ship.r
    };
    const flameRight = {
      dr: -s * 0.3 * Math.cos(h) + s * 0.2 * Math.cos(h - Math.PI / 2),
      dt: (-s * 0.3 * Math.sin(h) + s * 0.2 * Math.sin(h - Math.PI / 2)) / ship.r
    };

    const verts = [flameTip, flameLeft, flameRight].map(v =>
      rtToXY(ship.r + v.dr, ship.t + v.dt, this.cx, this.cy, this.scale)
    );

    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    ctx.lineTo(verts[1].x, verts[1].y);
    ctx.lineTo(verts[2].x, verts[2].y);
    ctx.closePath();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawBullet(bullet) {
    if (!bullet.alive) return;
    const pos = rtToXY(bullet.r, bullet.t, this.cx, this.cy, this.scale);
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  drawParticle(particle) {
    if (!particle.alive) return;
    const pos = rtToXY(particle.r, particle.t, this.cx, this.cy, this.scale);
    const ctx = this.ctx;
    ctx.globalAlpha = particle.alpha;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawHUD(score, lives, level) {
    const ctx = this.ctx;
    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${score}`, 20, 30);

    ctx.textAlign = 'left';
    for (let i = 0; i < lives; i++) {
      const lx = 20 + i * 25;
      const ly = 55;
      ctx.beginPath();
      ctx.moveTo(lx, ly - 8);
      ctx.lineTo(lx - 5, ly + 5);
      ctx.lineTo(lx + 5, ly + 5);
      ctx.closePath();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  drawTitleScreen() {
    const ctx = this.ctx;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ANNULAR', this.cx, this.cy - 30);
    ctx.fillText('ASTEROIDS', this.cx, this.cy + 30);

    ctx.font = '20px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('PRESS SPACE TO START', this.cx, this.cy + 90);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('ARROWS / WASD to move    SPACE to fire    P to pause', this.cx, this.cy + 130);
  }

  drawPauseOverlay() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', this.cx, this.cy);
  }

  drawGameOverOverlay(score) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', this.cx, this.cy - 20);
    ctx.font = '24px monospace';
    ctx.fillText(`SCORE: ${score}`, this.cx, this.cy + 30);
    ctx.font = '18px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('PRESS SPACE TO CONTINUE', this.cx, this.cy + 70);
  }

  drawLevelClearOverlay(level) {
    const ctx = this.ctx;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${level} CLEAR`, this.cx, this.cy);
  }
}
