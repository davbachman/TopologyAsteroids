import * as THREE from 'three';
import type { SphereDiskLayout } from './sphere';

const SPHERE_RADIUS = 1.24;

export interface SphereRenderer {
  resize: (width: number, height: number) => void;
  render: () => void;
  dispose: () => void;
}

function createHemisphereSampleShader() {
  return `
    vec2 sourceUvFromNormal(vec3 normalDir, vec2 sourceSize, vec2 leftCenter, vec2 rightCenter, float diskRadius) {
      vec2 center = normalDir.x < 0.0 ? leftCenter : rightCenter;
      vec2 diskPoint = center + vec2(normalDir.z, -normalDir.y) * diskRadius;
      return clamp(diskPoint / sourceSize, vec2(0.0), vec2(1.0));
    }
  `;
}

export function createSphereRenderer(
  host: HTMLElement,
  sourceCanvas: HTMLCanvasElement,
  layout: SphereDiskLayout,
  backOverlayCanvas?: HTMLCanvasElement,
): SphereRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.62, 3.18);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight('#ffffff', 0.82);
  const key = new THREE.DirectionalLight('#f2f6ff', 0.92);
  key.position.set(1.6, 1.5, 2.2);
  const fill = new THREE.DirectionalLight('#99bcff', 0.28);
  fill.position.set(-1.8, -0.7, 1.9);
  scene.add(ambient, key, fill);

  const baseTexture = new THREE.CanvasTexture(sourceCanvas);
  baseTexture.wrapS = THREE.ClampToEdgeWrapping;
  baseTexture.wrapT = THREE.ClampToEdgeWrapping;
  baseTexture.colorSpace = THREE.SRGBColorSpace;
  baseTexture.generateMipmaps = true;
  baseTexture.minFilter = THREE.LinearMipmapLinearFilter;
  baseTexture.magFilter = THREE.LinearFilter;
  baseTexture.anisotropy = Math.max(1, Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  let backTexture: THREE.CanvasTexture | null = null;
  if (backOverlayCanvas) {
    backTexture = new THREE.CanvasTexture(backOverlayCanvas);
    backTexture.wrapS = THREE.ClampToEdgeWrapping;
    backTexture.wrapT = THREE.ClampToEdgeWrapping;
    backTexture.colorSpace = THREE.SRGBColorSpace;
    backTexture.generateMipmaps = true;
    backTexture.minFilter = THREE.LinearMipmapLinearFilter;
    backTexture.magFilter = THREE.LinearFilter;
    backTexture.anisotropy = Math.max(1, Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  }

  const sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 80, 80);
  const sphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: baseTexture },
      uSourceSize: { value: new THREE.Vector2(layout.worldWidth, layout.worldHeight) },
      uLeftCenter: { value: new THREE.Vector2(layout.leftCenter.x, layout.leftCenter.y) },
      uRightCenter: { value: new THREE.Vector2(layout.rightCenter.x, layout.rightCenter.y) },
      uDiskRadius: { value: layout.diskRadius },
    },
    vertexShader: `
      varying vec3 vObjNormal;
      varying vec3 vWorldNormal;
      ${createHemisphereSampleShader()}
      void main() {
        vObjNormal = normalize(normal);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec2 uSourceSize;
      uniform vec2 uLeftCenter;
      uniform vec2 uRightCenter;
      uniform float uDiskRadius;
      varying vec3 vObjNormal;
      varying vec3 vWorldNormal;
      ${createHemisphereSampleShader()}
      void main() {
        vec3 n = normalize(vObjNormal);
        vec2 uv = sourceUvFromNormal(n, uSourceSize, uLeftCenter, uRightCenter, uDiskRadius);
        vec4 tex = texture2D(uMap, uv);
        vec3 lightDir = normalize(vec3(0.65, 0.84, 1.0));
        float diffuse = 0.44 + 0.56 * max(dot(normalize(vWorldNormal), lightDir), 0.0);
        gl_FragColor = vec4(tex.rgb * diffuse, tex.a);
      }
    `,
  });

  const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphereMesh);

  let backMaterial: THREE.ShaderMaterial | null = null;
  let backMesh: THREE.Mesh | null = null;
  if (backTexture) {
    backMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: backTexture },
        uSourceSize: { value: new THREE.Vector2(layout.worldWidth, layout.worldHeight) },
        uLeftCenter: { value: new THREE.Vector2(layout.leftCenter.x, layout.leftCenter.y) },
        uRightCenter: { value: new THREE.Vector2(layout.rightCenter.x, layout.rightCenter.y) },
        uDiskRadius: { value: layout.diskRadius },
        uTint: { value: new THREE.Color('#d8ebff') },
        uOpacity: { value: 0.34 },
      },
      vertexShader: `
        varying vec3 vObjNormal;
        ${createHemisphereSampleShader()}
        void main() {
          vObjNormal = normalize(normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform vec2 uSourceSize;
        uniform vec2 uLeftCenter;
        uniform vec2 uRightCenter;
        uniform float uDiskRadius;
        uniform vec3 uTint;
        uniform float uOpacity;
        varying vec3 vObjNormal;
        ${createHemisphereSampleShader()}
        void main() {
          vec3 n = normalize(vObjNormal);
          vec2 uv = sourceUvFromNormal(n, uSourceSize, uLeftCenter, uRightCenter, uDiskRadius);
          vec4 tex = texture2D(uMap, uv);
          float mask = max(max(tex.r, tex.g), tex.b) * tex.a;
          if (mask <= 0.01) discard;
          gl_FragColor = vec4(uTint, mask * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      depthFunc: THREE.GreaterDepth,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      toneMapped: false,
    });
    backMesh = new THREE.Mesh(sphereGeometry, backMaterial);
    backMesh.renderOrder = 1;
    scene.add(backMesh);
  }

  const dividerPoints: THREE.Vector3[] = [];
  const dividerSegments = 160;
  for (let i = 0; i < dividerSegments; i += 1) {
    const angle = (i / dividerSegments) * Math.PI * 2;
    dividerPoints.push(
      new THREE.Vector3(0, Math.cos(angle) * SPHERE_RADIUS * 1.002, Math.sin(angle) * SPHERE_RADIUS * 1.002),
    );
  }
  const dividerGeometry = new THREE.BufferGeometry().setFromPoints(dividerPoints);
  const dividerMaterial = new THREE.LineBasicMaterial({
    color: '#eef4ff',
    transparent: true,
    opacity: 0.92,
  });
  const dividerLoop = new THREE.LineLoop(dividerGeometry, dividerMaterial);
  scene.add(dividerLoop);

  host.appendChild(renderer.domElement);

  function resize(width: number, height: number): void {
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    renderer.setSize(safeWidth, safeHeight, false);
    camera.aspect = safeWidth / safeHeight;
    camera.updateProjectionMatrix();

    const fov = THREE.MathUtils.degToRad(camera.fov);
    const hDistance = SPHERE_RADIUS / Math.tan(fov * 0.5);
    const hfov = 2 * Math.atan(Math.tan(fov * 0.5) * camera.aspect);
    const wDistance = SPHERE_RADIUS / Math.tan(hfov * 0.5);
    const fitDistance = Math.max(hDistance, wDistance) * 1.3;

    camera.position.set(0, fitDistance * 0.2, fitDistance * 0.92);
    camera.lookAt(0, 0, 0);
  }

  function render(): void {
    baseTexture.needsUpdate = true;
    if (backTexture) {
      backTexture.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }

  function dispose(): void {
    baseTexture.dispose();
    if (backTexture) {
      backTexture.dispose();
    }
    sphereGeometry.dispose();
    sphereMaterial.dispose();
    if (backMaterial) {
      backMaterial.dispose();
    }
    dividerGeometry.dispose();
    dividerMaterial.dispose();
    renderer.dispose();
  }

  return {
    resize,
    render,
    dispose,
  };
}
