import * as THREE from 'three';

const LOCKED_SHIP_U = 0.25;
const LOCKED_SHIP_V = 0.0;
const FIXED_TORUS_ROTATION_X = Math.PI * 0.5 + 0.12;
const FIXED_TORUS_ROTATION_Y = 0;
const TORUS_MAJOR_RADIUS = 1.2;
const TORUS_TUBE_RADIUS = 0.66;

export interface TorusTextureLock {
  shipU: number;
  shipV: number;
  lockedU: number;
  lockedV: number;
  offsetX: number;
  offsetY: number;
  meshRotationX: number;
  meshRotationY: number;
}

export interface SharedTorusRenderer {
  resize: (width: number, height: number) => void;
  render: (shipX?: number, shipY?: number) => void;
  dispose: () => void;
}

interface SharedTorusRendererOptions {
  worldWidth?: number;
  worldHeight?: number;
  fixedTextureOffset?: { x: number; y: number };
}

function wrapValue(value: number, extent: number): number {
  let wrapped = value % extent;
  if (wrapped < 0) {
    wrapped += extent;
  }
  return wrapped;
}

function wrapUnit(value: number): number {
  let wrapped = value % 1;
  if (wrapped < 0) {
    wrapped += 1;
  }
  return wrapped;
}

export function computeTorusTextureLock(
  shipX: number,
  shipY: number,
  worldWidth: number,
  worldHeight: number,
): TorusTextureLock {
  const shipU = wrapValue(shipX, worldWidth) / worldWidth;
  const shipV = 1 - wrapValue(shipY, worldHeight) / worldHeight;
  const offsetX = wrapUnit(shipU - LOCKED_SHIP_U);
  const offsetY = wrapUnit(shipV - LOCKED_SHIP_V);

  return {
    shipU,
    shipV,
    lockedU: LOCKED_SHIP_U,
    lockedV: LOCKED_SHIP_V,
    offsetX,
    offsetY,
    meshRotationX: FIXED_TORUS_ROTATION_X,
    meshRotationY: FIXED_TORUS_ROTATION_Y,
  };
}

export function createSharedTorusRenderer(
  host: HTMLElement,
  sourceCanvas: HTMLCanvasElement,
  options: SharedTorusRendererOptions = {},
): SharedTorusRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f3eee2');

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 2.3, 4.8);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight('#ffffff', 0.98);
  const key = new THREE.DirectionalLight('#f8fbff', 1.08);
  key.position.set(2.8, 3.2, 4.6);
  const fill = new THREE.DirectionalLight('#ffd8ac', 0.45);
  fill.position.set(-2.1, -1.8, 2.6);

  scene.add(ambient, key, fill);

  const texture = new THREE.CanvasTexture(sourceCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;

  if (options.fixedTextureOffset) {
    texture.offset.x = options.fixedTextureOffset.x;
    texture.offset.y = options.fixedTextureOffset.y;
  }
  texture.needsUpdate = true;

  const torusGeometry = new THREE.TorusGeometry(TORUS_MAJOR_RADIUS, TORUS_TUBE_RADIUS, 80, 180);
  const torusMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.74,
    metalness: 0.18,
    color: '#fffdf7',
  });

  const torus = new THREE.Mesh(torusGeometry, torusMaterial);
  scene.add(torus);

  const ringGeometry = new THREE.TorusGeometry(TORUS_MAJOR_RADIUS, TORUS_TUBE_RADIUS + 0.005, 8, 120);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: '#53617a',
    transparent: true,
    opacity: 0.2,
    wireframe: true,
  });
  const wireRing = new THREE.Mesh(ringGeometry, ringMaterial);
  scene.add(wireRing);

  torus.rotation.x = FIXED_TORUS_ROTATION_X;
  torus.rotation.y = FIXED_TORUS_ROTATION_Y;
  wireRing.rotation.copy(torus.rotation);

  host.appendChild(renderer.domElement);

  function resize(width: number, height: number): void {
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));

    renderer.setSize(safeWidth, safeHeight, false);
    camera.aspect = safeWidth / safeHeight;
    camera.updateProjectionMatrix();

    const boundsRadius = TORUS_MAJOR_RADIUS + TORUS_TUBE_RADIUS;
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov * 0.5) * camera.aspect);
    const distanceForHeight = boundsRadius / Math.tan(verticalFov * 0.5);
    const distanceForWidth = boundsRadius / Math.tan(horizontalFov * 0.5);
    const fitDistance = Math.max(distanceForHeight, distanceForWidth) * 1.1;

    camera.position.set(0, fitDistance * 0.56, fitDistance);
    camera.lookAt(0, 0, 0);
  }

  function render(shipX?: number, shipY?: number): void {
    if (
      typeof shipX === 'number' &&
      typeof shipY === 'number' &&
      typeof options.worldWidth === 'number' &&
      typeof options.worldHeight === 'number'
    ) {
      const lock = computeTorusTextureLock(shipX, shipY, options.worldWidth, options.worldHeight);
      texture.offset.set(lock.offsetX, lock.offsetY);
    }

    texture.needsUpdate = true;
    renderer.render(scene, camera);
  }

  function dispose(): void {
    texture.dispose();
    torusGeometry.dispose();
    torusMaterial.dispose();
    ringGeometry.dispose();
    ringMaterial.dispose();
    renderer.dispose();
  }

  return {
    resize,
    render,
    dispose,
  };
}
