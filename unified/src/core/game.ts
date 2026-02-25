import type { Topology } from '../topology/topology';
import { AudioEngine } from './audio/audioEngine';
import { drainAudioEvents } from './audio/sfx';
import { circlesOverlap, segmentIntersectsCircle } from './collision';
import { GAME_CONFIG } from './config';
import { InputManager } from './input';
import { FixedStepLoop } from './loop';
import { randRange } from './math/random';
import { add, normalize, scale } from './math/vector';
import { CanvasRenderer } from './render/canvasRenderer';
import {
  bulletSpawnFromShip,
  createBullet,
  createPlayer,
  createUfo,
  randomSafeHyperspacePoint,
  spawnAsteroidWave,
  splitAsteroid,
} from './spawn';
import { createBaseGameState } from './state';
import { updateAsteroids } from './update/asteroids';
import { pruneExpiredBullets, updateBullets } from './update/bullets';
import { asteroidScore, ufoScore } from './update/gameRules';
import { updatePlayerMovement } from './update/player';
import { retargetUfoCourse, updateUfoMovement } from './update/ufo';
import type { AudioEvent, AsteroidState, GameMode, GameState, UfoType, Vec2 } from './types';

interface GameOptions {
  toggleFullscreen?: () => void | Promise<void>;
  onEscape?: () => void;
}

export class Game {
  private state: GameState = createBaseGameState();
  private readonly renderer: CanvasRenderer;
  private readonly input: InputManager;
  private readonly loop: FixedStepLoop;
  private readonly audio = new AudioEngine();
  private readonly pendingAudioEvents: AudioEvent[] = [];
  private pausedResumeMode: Extract<GameMode, 'playing' | 'respawning'> = 'playing';

  constructor(
    canvas: HTMLCanvasElement,
    private readonly topology: Topology,
    private readonly options: GameOptions = {},
  ) {
    this.renderer = new CanvasRenderer(canvas, topology);
    this.input = new InputManager(() => {
      void this.audio.unlock().then(() => this.syncAudioState());
    });
    this.loop = new FixedStepLoop(GAME_CONFIG.fixedDt, this.update, this.render);
    this.state.mode = 'start';
    // Set initial player position to spawn center
    const center = topology.spawnCenter();
    this.state.player.pos.x = center.x;
    this.state.player.pos.y = center.y;
    this.syncAudioState();
  }

  start(): void {
    this.input.attach(window);
    this.loop.start();
    this.render();
  }

  destroy(): void {
    this.loop.stop();
    this.input.detach(window);
    this.audio.shutdown();
  }

  advanceTime(ms: number): void {
    this.loop.stepByMs(ms);
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.canvas;
  }

  getState(): GameState {
    return this.state;
  }

  private update = (dt: number): void => {
    const input = this.input.getState();
    const state = this.state;

    if (input.mutePressed) {
      this.audio.toggleMute();
      this.syncAudioState();
    }

    if (input.fullscreenPressed) {
      void this.options.toggleFullscreen?.();
    }

    if (input.escapePressed) {
      this.options.onEscape?.();
      this.input.endFrame();
      return;
    }

    if (input.pausePressed) {
      if (state.mode === 'paused') {
        state.mode = this.pausedResumeMode;
      } else if (state.mode === 'playing' || state.mode === 'respawning') {
        this.pausedResumeMode = state.mode;
        state.mode = 'paused';
      }
    }

    if ((state.mode === 'start' || state.mode === 'gameOver') && input.startPressed) {
      this.startNewGame();
    }

    if (state.mode === 'paused' || state.mode === 'start' || state.mode === 'gameOver' || state.mode === 'boot') {
      this.audio.setThrust(false);
      this.audio.setUfoHum(false, 'large');
      this.syncAudioState();
      this.input.endFrame();
      return;
    }

    state.tick += 1;
    state.time += dt;

    this.handlePlayerPhase(dt, input);

    updateAsteroids(state.asteroids, this.topology, dt);
    updateBullets(state.playerBullets, this.topology, dt);
    updateBullets(state.ufoBullets, this.topology, dt);
    state.playerBullets = pruneExpiredBullets(state.playerBullets);
    state.ufoBullets = pruneExpiredBullets(state.ufoBullets);

    this.updateUfo(dt);
    this.handleProjectileCollisions();
    this.handleShipAndUfoBodyCollisions();
    this.handleWaveAndRespawn(dt);
    this.handleAudio(dt);

    drainAudioEvents(this.audio, this.pendingAudioEvents);
    this.syncAudioState();
    this.input.endFrame();
  };

  private render = (): void => {
    this.renderer.render(this.state);
  };

  private handlePlayerPhase(dt: number, input: ReturnType<InputManager['getState']>): void {
    const state = this.state;
    const player = state.player;

    if (player.alive) {
      if (input.hyperspacePressed && state.mode === 'playing') {
        this.tryHyperspace();
      }

      if (state.mode === 'playing') {
        if (input.fire && player.fireCooldown <= 0 && state.playerBullets.length < GAME_CONFIG.bullets.maxPlayerBullets) {
          this.firePlayerBullet();
        }
        updatePlayerMovement(player, input, GAME_CONFIG.player, dt);
      } else {
        player.thrusting = false;
        player.fireCooldown = Math.max(0, player.fireCooldown - dt);
        player.invulnerableTimer = Math.max(0, player.invulnerableTimer - dt);
        player.blinkPhase += dt * 12;
      }

      const beforeWrap = { x: player.pos.x, y: player.pos.y };
      const wrap = this.topology.wrapInPlace(player.pos);
      if (wrap.passes > 0) {
        this.topology.transformWrappedVelocityInPlace?.(player.vel, beforeWrap, player.pos);
        if (this.topology.transformWrappedAngle) {
          player.angle = this.topology.transformWrappedAngle(player.angle, beforeWrap, player.pos);
        }
      }
    } else {
      player.thrusting = false;
    }
  }

  private handleWaveAndRespawn(dt: number): void {
    const state = this.state;

    if (state.asteroids.length === 0 && state.wave > 0 && state.waveClearTimer <= 0) {
      state.waveClearTimer = GAME_CONFIG.wave.clearDelay;
      if (state.ufo) state.ufo = null;
    }

    if (state.waveClearTimer > 0) {
      state.waveClearTimer = Math.max(0, state.waveClearTimer - dt);
      if (state.waveClearTimer === 0 && state.asteroids.length === 0 && state.mode !== 'gameOver') {
        state.wave += 1;
        this.spawnWave(state.wave);
      }
    }

    if (state.mode === 'respawning' && !state.player.alive) {
      state.respawnTimer = Math.max(0, state.respawnTimer - dt);
      if (state.respawnTimer <= 0) {
        const center = this.topology.spawnCenter();
        if (this.isSpawnSafe(center, GAME_CONFIG.player.collisionRadius + 16)) {
          this.respawnPlayer();
        } else {
          state.respawnTimer = 0.25;
        }
      }
    }
  }

  private updateUfo(dt: number): void {
    const state = this.state;

    if (state.ufo) {
      updateUfoMovement(state.ufo, this.topology, dt);
      if (state.ufo.courseTimer <= 0) retargetUfoCourse(state.ufo);
      if (state.ufo.fireCooldown <= 0 && state.player.alive) {
        this.fireUfoBullet(state.ufo);
        state.ufo.fireCooldown = state.ufo.type === 'large'
          ? randRange(GAME_CONFIG.ufo.fireCooldownLarge[0], GAME_CONFIG.ufo.fireCooldownLarge[1])
          : randRange(GAME_CONFIG.ufo.fireCooldownSmall[0], GAME_CONFIG.ufo.fireCooldownSmall[1]);
      }
    } else if (state.wave > 0 && state.waveClearTimer <= 0 && state.mode !== 'gameOver') {
      state.ufoSpawnTimer -= dt;
      if (state.ufoSpawnTimer <= 0) {
        const type: UfoType = state.wave >= GAME_CONFIG.ufo.smallWaveThreshold && Math.random() < 0.65 ? 'small' : 'large';
        state.ufo = createUfo(this.nextId(), type, this.topology);
        this.resetUfoSpawnTimer();
      }
    }
  }

  private handleProjectileCollisions(): void {
    const state = this.state;
    const removePlayerBullets = new Set<number>();
    const removeUfoBullets = new Set<number>();
    const removeAsteroids = new Set<number>();
    const asteroidFragments: AsteroidState[] = [];
    let destroyUfoByPlayer = false;
    let destroyUfoByAsteroid = false;

    const splitAndQueue = (asteroid: AsteroidState, awardPlayerScore: boolean): void => {
      if (removeAsteroids.has(asteroid.id)) return;
      removeAsteroids.add(asteroid.id);
      if (awardPlayerScore) this.addScore(asteroidScore(asteroid.size));
      const eventMap = {
        large: 'asteroidExplosionLarge',
        medium: 'asteroidExplosionMedium',
        small: 'asteroidExplosionSmall',
      } as const;
      this.queueAudio(eventMap[asteroid.size]);
      const split = splitAsteroid(asteroid, state.nextEntityId);
      state.nextEntityId = split.nextId;
      asteroidFragments.push(...split.fragments);
    };

    for (const bullet of state.playerBullets) {
      if (removePlayerBullets.has(bullet.id)) continue;

      let hit = false;
      for (const asteroid of state.asteroids) {
        if (removeAsteroids.has(asteroid.id)) continue;
        if (segmentIntersectsCircle(bullet.prevPos, bullet.pos, asteroid.pos, asteroid.radius)) {
          removePlayerBullets.add(bullet.id);
          splitAndQueue(asteroid, true);
          hit = true;
          break;
        }
      }
      if (hit) continue;

      if (state.ufo && !destroyUfoByPlayer && segmentIntersectsCircle(bullet.prevPos, bullet.pos, state.ufo.pos, state.ufo.radius)) {
        removePlayerBullets.add(bullet.id);
        destroyUfoByPlayer = true;
        this.addScore(ufoScore(state.ufo.type));
        this.queueAudio('asteroidExplosionMedium');
      }
    }

    for (const bullet of state.ufoBullets) {
      if (removeUfoBullets.has(bullet.id)) continue;

      let hitAsteroid = false;
      for (const asteroid of state.asteroids) {
        if (removeAsteroids.has(asteroid.id)) continue;
        if (segmentIntersectsCircle(bullet.prevPos, bullet.pos, asteroid.pos, asteroid.radius)) {
          removeUfoBullets.add(bullet.id);
          splitAndQueue(asteroid, false);
          hitAsteroid = true;
          break;
        }
      }
      if (hitAsteroid) continue;

      if (
        state.player.alive &&
        state.player.invulnerableTimer <= 0 &&
        segmentIntersectsCircle(bullet.prevPos, bullet.pos, state.player.pos, state.player.collisionRadius)
      ) {
        removeUfoBullets.add(bullet.id);
        this.killPlayer();
      }
    }

    if (state.ufo) {
      for (const asteroid of state.asteroids) {
        if (removeAsteroids.has(asteroid.id)) continue;
        if (circlesOverlap(state.ufo.pos, state.ufo.radius, asteroid.pos, asteroid.radius)) {
          destroyUfoByAsteroid = true;
          splitAndQueue(asteroid, false);
          break;
        }
      }
    }

    state.playerBullets = state.playerBullets.filter((b) => !removePlayerBullets.has(b.id));
    state.ufoBullets = state.ufoBullets.filter((b) => !removeUfoBullets.has(b.id));
    if (removeAsteroids.size > 0) {
      state.asteroids = state.asteroids.filter((a) => !removeAsteroids.has(a.id));
      state.asteroids.push(...asteroidFragments);
    }
    if (destroyUfoByPlayer || destroyUfoByAsteroid) state.ufo = null;
  }

  private handleShipAndUfoBodyCollisions(): void {
    const state = this.state;
    const player = state.player;
    if (!player.alive || player.invulnerableTimer > 0) return;

    for (const asteroid of state.asteroids) {
      if (circlesOverlap(player.pos, player.collisionRadius, asteroid.pos, asteroid.radius * 0.9)) {
        this.killPlayer();
        return;
      }
    }

    if (state.ufo && circlesOverlap(player.pos, player.collisionRadius, state.ufo.pos, state.ufo.radius)) {
      state.ufo = null;
      this.killPlayer();
    }
  }

  private firePlayerBullet(): void {
    const state = this.state;
    const { pos, dir } = bulletSpawnFromShip(state.player);
    const vel = add(scale(dir, GAME_CONFIG.player.bulletSpeed), state.player.vel);
    state.playerBullets.push(createBullet(this.nextId(), 'player', pos, vel));
    state.player.fireCooldown = GAME_CONFIG.player.fireCooldown;
    this.queueAudio('playerFire');
  }

  private fireUfoBullet(ufo: import('./types').UfoState): void {
    const state = this.state;
    const player = state.player;

    let aimDir: Vec2;
    if (!player.alive) {
      aimDir = normalize({ x: -ufo.pos.x, y: -ufo.pos.y });
    } else {
      const toPlayer = { x: player.pos.x - ufo.pos.x, y: player.pos.y - ufo.pos.y };
      const dist = Math.hypot(toPlayer.x, toPlayer.y);
      if (ufo.type === 'small') {
        const t = dist / Math.max(80, GAME_CONFIG.ufo.bulletSpeed);
        const target = {
          x: player.pos.x + player.vel.x * t,
          y: player.pos.y + player.vel.y * t,
        };
        aimDir = normalize({ x: target.x - ufo.pos.x, y: target.y - ufo.pos.y });
        const error = randRange(-0.18, 0.18);
        aimDir = {
          x: aimDir.x * Math.cos(error) - aimDir.y * Math.sin(error),
          y: aimDir.x * Math.sin(error) + aimDir.y * Math.cos(error),
        };
        aimDir = normalize(aimDir);
      } else {
        aimDir = normalize(toPlayer);
        const error = randRange(-0.75, 0.75);
        aimDir = {
          x: aimDir.x * Math.cos(error) - aimDir.y * Math.sin(error),
          y: aimDir.x * Math.sin(error) + aimDir.y * Math.cos(error),
        };
        aimDir = normalize(aimDir);
      }
    }

    const spawnPos = add(ufo.pos, scale(aimDir, ufo.radius + 2));
    const bulletVel = add(scale(aimDir, GAME_CONFIG.ufo.bulletSpeed), scale(ufo.vel, 0.35));
    state.ufoBullets.push(createBullet(this.nextId(), 'ufo', spawnPos, bulletVel));
    this.queueAudio('ufoFire');
  }

  private tryHyperspace(): void {
    const state = this.state;
    const player = state.player;
    if (!player.alive) return;

    for (let i = 0; i < GAME_CONFIG.player.hyperspaceSafeAttempts; i += 1) {
      const candidate = randomSafeHyperspacePoint(this.topology, Math.random, GAME_CONFIG.player.collisionRadius);
      if (this.isSpawnSafe(candidate, GAME_CONFIG.player.collisionRadius + 22)) {
        player.pos = candidate;
        this.topology.wrapInPlace(player.pos);
        player.invulnerableTimer = Math.max(player.invulnerableTimer, GAME_CONFIG.player.hyperspaceInvulnerability);
        this.queueAudio('hyperspace');
        return;
      }
    }

    this.queueAudio('hyperspace');
    this.killPlayer();
  }

  private isSpawnSafe(pos: Vec2, radius: number): boolean {
    const state = this.state;
    for (const asteroid of state.asteroids) {
      if (circlesOverlap(pos, radius, asteroid.pos, asteroid.radius + 30)) return false;
    }
    if (state.ufo && circlesOverlap(pos, radius, state.ufo.pos, state.ufo.radius + 20)) return false;
    for (const bullet of state.ufoBullets) {
      if (circlesOverlap(pos, radius, bullet.pos, bullet.radius + 8)) return false;
    }
    return true;
  }

  private killPlayer(): void {
    const state = this.state;
    if (!state.player.alive) return;
    state.player.alive = false;
    state.player.thrusting = false;
    state.player.fireCooldown = 0;
    state.lives -= 1;
    this.queueAudio('shipDeath');

    if (state.lives <= 0) {
      state.mode = 'gameOver';
      this.queueAudio('gameOver');
      return;
    }

    state.mode = 'respawning';
    state.respawnTimer = GAME_CONFIG.player.respawnDelay;
  }

  private respawnPlayer(): void {
    const state = this.state;
    const center = this.topology.spawnCenter();
    state.player = {
      ...state.player,
      pos: { x: center.x, y: center.y },
      vel: { x: 0, y: 0 },
      angle: -Math.PI / 2,
      alive: true,
      invulnerableTimer: GAME_CONFIG.player.invulnerabilityTime,
      blinkPhase: 0,
      thrusting: false,
      fireCooldown: 0,
    };
    state.mode = 'playing';
  }

  private addScore(points: number): void {
    if (points <= 0) return;
    const state = this.state;
    state.score += points;
    while (state.score >= state.nextExtraLifeScore) {
      state.lives += 1;
      state.nextExtraLifeScore += GAME_CONFIG.scoring.extraLifeEvery;
      this.queueAudio('extraLife');
    }
  }

  private resetUfoSpawnTimer(): void {
    this.state.ufoSpawnTimer = randRange(GAME_CONFIG.ufo.spawnIntervalRange[0], GAME_CONFIG.ufo.spawnIntervalRange[1]);
  }

  private spawnWave(wave: number): void {
    const result = spawnAsteroidWave(this.state.nextEntityId, wave, this.topology);
    this.state.asteroids = result.asteroids;
    this.state.nextEntityId = result.nextId;
    this.state.waveClearTimer = 0;
    this.state.ufo = null;
    this.state.ufoBullets = [];
    this.resetUfoSpawnTimer();
  }

  private startNewGame(): void {
    const priorAudio = { ...this.state.audio };
    this.state = createBaseGameState();
    this.state.audio = priorAudio;
    this.state.mode = 'playing';
    this.state.wave = 1;
    this.state.player = createPlayer(this.state.player.id);
    const center = this.topology.spawnCenter();
    this.state.player.pos.x = center.x;
    this.state.player.pos.y = center.y;
    this.state.nextEntityId = Math.max(this.state.nextEntityId, 2);
    this.spawnWave(1);
    this.resetUfoSpawnTimer();
  }

  private handleAudio(dt: number): void {
    const state = this.state;
    this.audio.setThrust(state.mode === 'playing' && state.player.alive && state.player.thrusting);
    this.audio.setUfoHum(Boolean(state.ufo), state.ufo?.type ?? 'large');
    if (state.mode === 'playing' || state.mode === 'respawning') {
      this.audio.tickHeartbeat(dt, state.asteroids.length);
    }
  }

  private queueAudio(name: AudioEvent['name']): void {
    this.pendingAudioEvents.push({ name });
    this.state.debugLastEvents.push(`audio:${name}`);
    if (this.state.debugLastEvents.length > 16) this.state.debugLastEvents.shift();
  }

  private nextId(): number {
    const id = this.state.nextEntityId;
    this.state.nextEntityId += 1;
    return id;
  }

  private syncAudioState(): void {
    this.state.audio = this.audio.getState();
  }
}
