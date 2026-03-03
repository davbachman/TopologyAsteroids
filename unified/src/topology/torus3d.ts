import { createSharedTorusRenderer } from '../shared/torusRenderer';

export interface TorusRenderer {
  resize: (width: number, height: number) => void;
  render: () => void;
  dispose: () => void;
}

export function createTorusRenderer(
  host: HTMLElement,
  sourceCanvas: HTMLCanvasElement,
  backOverlayCanvas?: HTMLCanvasElement,
): TorusRenderer {
  const shared = createSharedTorusRenderer(host, sourceCanvas, {
    // Position the center of the rectangle on the front-facing surface.
    // Rotate the torus vertical texture parameter by 180 degrees.
    fixedTextureOffset: { x: 0.25, y: 0.25 },
    backOverlayCanvas,
  });
  return {
    resize: shared.resize,
    render: () => shared.render(),
    dispose: shared.dispose,
  };
}
