import {
  computeTorusTextureLock,
  createSharedTorusRenderer,
  type TorusTextureLock,
} from '../../../unified/src/shared/torusRenderer';

export interface TorusRenderer {
  resize: (width: number, height: number) => void;
  render: (shipX: number, shipY: number) => void;
  dispose: () => void;
}

export { computeTorusTextureLock };

export function createTorusRenderer(
  host: HTMLElement,
  sourceCanvas: HTMLCanvasElement,
  worldWidth: number,
  worldHeight: number
): TorusRenderer {
  const shared = createSharedTorusRenderer(host, sourceCanvas, {
    worldWidth,
    worldHeight,
  });

  return {
    resize: shared.resize,
    render: (shipX, shipY) => shared.render(shipX, shipY),
    dispose: shared.dispose
  }
}
