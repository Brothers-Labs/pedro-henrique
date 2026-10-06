import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

import { context2d, createCanvas } from '../../pedro-maker/art/canvas';
import { QUALITY, type QualitySettings, type QualityTier } from '../../pedro-maker/engine/render/quality';
import type { TrackThemeDefinition } from '../config/theme.config';

/** Onde o sol fica em relação ao kart: alto e de lado, para a sombra cair perto dele. */
const SUN_OFFSET = { x: -18, y: 40, z: 12 } as const;
const SHADOW_EXTENT = 30;

/**
 * O palco da corrida: renderizador, cena, câmera e luzes.
 *
 * É o primo do palco do Pedro Maker, mas olha a pista de trás do kart, e não
 * de lado: a câmera vê longe, e a sombra acompanha o kart do Pedro.
 */
export class KartStage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(62, 16 / 9, 0.3, 700);
  readonly sun: DirectionalLight;

  private readonly skyTexture: CanvasTexture;
  private readonly resizeObserver: ResizeObserver;

  constructor(
    private readonly parent: HTMLElement,
    theme: TrackThemeDefinition,
    tier: QualityTier,
  ) {
    this.renderer = new WebGLRenderer({ antialias: tier !== 'baixa', powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    const canvas = this.renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
    canvas.setAttribute('aria-hidden', 'true');
    parent.appendChild(canvas);

    this.skyTexture = paintSky(theme);
    this.scene.background = this.skyTexture;
    this.scene.fog = new Fog(new Color(theme.skyBottom), 90, 320);
    this.scene.add(new HemisphereLight(new Color(theme.skyTop), new Color(theme.ground), theme.isDark ? 0.9 : 1.3));

    this.sun = new DirectionalLight(new Color(theme.sun), theme.isDark ? 1.1 : 2.3);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.camera.left = -SHADOW_EXTENT;
    this.sun.shadow.camera.right = SHADOW_EXTENT;
    this.sun.shadow.camera.top = SHADOW_EXTENT;
    this.sun.shadow.camera.bottom = -SHADOW_EXTENT;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 120;
    this.scene.add(this.sun, this.sun.target);

    this.applyQuality(tier);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(parent);
    this.resize();
  }

  applyQuality(tier: QualityTier): QualitySettings {
    const quality = QUALITY[tier];

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatio));
    this.renderer.shadowMap.enabled = quality.shadows;
    this.sun.castShadow = quality.shadows;
    this.sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.resize();

    return quality;
  }

  follow(x: number, z: number): void {
    this.sun.position.set(x + SUN_OFFSET.x, SUN_OFFSET.y, z + SUN_OFFSET.z);
    this.sun.target.position.set(x, 0, z);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.skyTexture.dispose();
    this.sun.shadow.map?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  private resize(): void {
    const width = Math.max(1, this.parent.clientWidth);
    const height = Math.max(1, this.parent.clientHeight);

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    // Na tela em pé o kart some de tão estreito: a câmera abre mais o ângulo.
    this.camera.fov = width < height ? 78 : 62;
    this.camera.updateProjectionMatrix();
  }
}

/** Céu em degradê; no espaço, salpicado de estrelas. */
function paintSky(theme: TrackThemeDefinition): CanvasTexture {
  const canvas = createCanvas(256, 256);
  const context = context2d(canvas);
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);

  gradient.addColorStop(0, theme.skyTop);
  gradient.addColorStop(1, theme.skyBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (theme.isDark) {
    context.fillStyle = '#ffffff';

    for (let index = 0; index < 90; index += 1) {
      // Posições fixas (sem sorteio): o céu é o mesmo em toda corrida.
      const x = (index * 97) % canvas.width;
      const y = (index * 53) % (canvas.height * 0.7);

      context.fillRect(x, y, index % 7 === 0 ? 2 : 1, index % 7 === 0 ? 2 : 1);
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;

  return texture;
}
