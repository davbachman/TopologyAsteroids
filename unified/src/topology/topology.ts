import type { Vec2 } from '../core/types';

export interface WrapResult {
  offset: Vec2;
  passes: number;
}

export interface Topology {
  readonly name: string;
  readonly displayName: string;

  /** Wrap point in place. Returns offset for bullet prevPos adjustment. */
  wrapInPlace(point: Vec2): WrapResult;

  /**
   * Optional kinematics transform applied after a wrap (for non-translation seam glueing).
   * Mutates velocity in place.
   */
  transformWrappedVelocityInPlace?(vel: Vec2, beforeWrapPos: Vec2, afterWrapPos: Vec2): void;

  /** Optional heading transform applied after a wrap. */
  transformWrappedAngle?(angle: number, beforeWrapPos: Vec2, afterWrapPos: Vec2): number;

  /** Is the point inside the playable area? */
  containsPoint(point: Vec2, margin?: number): boolean;

  /** Ghost offsets for rendering near edges. Always includes {0,0}. */
  getGhostOffsets(point: Vec2, radius: number): Vec2[];

  /** Random point inside bounds with margin from edges. */
  randomPointInBounds(margin?: number, rng?: () => number): Vec2;

  /** Random point on a boundary edge, with inward-facing direction. */
  pointOnRandomEdge(rng?: () => number): { point: Vec2; inward: Vec2 };

  /** Center spawn point (player respawn). */
  spawnCenter(): Vec2;

  /** Build a clip path for the playable area. Caller should call ctx.clip() after. */
  buildClipPath(ctx: CanvasRenderingContext2D): void;

  /** Draw the boundary outline. */
  drawBoundary(ctx: CanvasRenderingContext2D): void;

  /** Draw background stars. */
  drawStars(ctx: CanvasRenderingContext2D, time: number): void;

  /** Logical canvas size (square). For rectangle topology this is max(width,height). */
  readonly logicalSize: number;

  /** World width (for rectangle: 1024, others: logicalSize). */
  readonly worldWidth: number;

  /** World height (for rectangle: 768, others: logicalSize). */
  readonly worldHeight: number;

  /** Whether the renderer should translate to center before drawing. */
  readonly centered: boolean;
}

export type TopologyType = 'octagon' | 'rectangle' | 'annulus' | 'sphere' | 'handle' | 'klein' | 'projective';
