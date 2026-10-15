import {
  ACESFilmicToneMapping,
  type CanvasTexture,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

import { QUALITY, type QualityTier } from '../../games/pedro-maker/engine/render/quality';
import { skyTexture } from './textures';

const SHADOW_EXTENT = 30;
const SUN_OFFSET = { x: -18, y: 34, z: -10 } as const;

export interface StageOptions {
  readonly tier: QualityTier;
  readonly onContextLost: () => void;
  readonly onContextRestored: () => void;
}

export interface SkyOptions {
  readonly top: string;
  readonly bottom: string;
  readonly fogNear: number;
  readonly fogFar: number;
  readonly isNight: boolean;
}

/**
 * O palco do Pedro Aventura: renderizador, cena, câmera e luzes.
 *
 * Cuida também do que a placa de vídeo pode fazer sem avisar: quando o
 * navegador tira o contexto WebGL (aba em segundo plano, memória curta), o
 * palco avisa quem o criou para pausar; quando devolve, avisa para seguir.
 */
export class AventuraStage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(62, 16 / 9, 0.3, 600);
  readonly sun: DirectionalLight;

  private readonly hemisphere: HemisphereLight;
  private readonly resizeObserver: ResizeObserver;
  private sky: CanvasTexture | null = null;
  private isPortraitValue = false;

  constructor(
    private readonly parent: HTMLElement,
    private readonly options: StageOptions,
  ) {
    this.renderer = new WebGLRenderer({ antialias: options.tier !== 'baixa', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.shadowMap.type = PCFShadowMap;

    const canvas = this.renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    parent.appendChild(canvas);

    this.hemisphere = new HemisphereLight(new Color('#ffffff'), new Color('#444444'), 1.2);
    this.sun = new DirectionalLight(new Color('#ffffff'), 2.2);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.camera.left = -SHADOW_EXTENT;
    this.sun.shadow.camera.right = SHADOW_EXTENT;
    this.sun.shadow.camera.top = SHADOW_EXTENT;
    this.sun.shadow.camera.bottom = -SHADOW_EXTENT;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 120;
    this.scene.add(this.hemisphere, this.sun, this.sun.target);

    this.applyQuality(options.tier);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(parent);
    this.resize();
  }

  get isPortrait(): boolean {
    return this.isPortraitValue;
  }

  setSky(options: SkyOptions): void {
    this.sky?.dispose();
    this.sky = skyTexture(options.top, options.bottom);
    this.scene.background = this.sky;
    this.scene.fog = new Fog(new Color(options.bottom), options.fogNear, options.fogFar);
    this.hemisphere.color.set(options.isNight ? '#6a6aff' : options.top);
    this.hemisphere.groundColor.set(options.isNight ? '#1a1030' : '#6b5a44');
    this.hemisphere.intensity = options.isNight ? 0.7 : 1.3;
    this.sun.color.set(options.isNight ? '#a9b8ff' : '#fff2d6');
    this.sun.intensity = options.isNight ? 0.6 : 2.3;
    this.renderer.toneMappingExposure = options.isNight ? 1.2 : 1;
  }

  applyQuality(tier: QualityTier): void {
    const quality = QUALITY[tier];

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatio));
    this.renderer.shadowMap.enabled = quality.shadows;
    this.sun.castShadow = quality.shadows;
    this.sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.resize();
  }

  /** O sol acompanha quem a câmera segue, para a sombra cair sempre perto. */
  follow(x: number, y: number, z: number): void {
    this.sun.position.set(x + SUN_OFFSET.x, y + SUN_OFFSET.y, z + SUN_OFFSET.z);
    this.sun.target.position.set(x, y, z);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    const canvas = this.renderer.domElement;

    canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.resizeObserver.disconnect();
    this.sky?.dispose();
    this.sun.shadow.map?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    canvas.remove();
  }

  private resize(): void {
    const width = Math.max(1, this.parent.clientWidth);
    const height = Math.max(1, this.parent.clientHeight);

    this.isPortraitValue = height > width;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private readonly handleContextLost = (event: Event): void => {
    // Sem o `preventDefault` o navegador não devolve o contexto depois.
    event.preventDefault();
    this.options.onContextLost();
  };

  private readonly handleContextRestored = (): void => {
    this.options.onContextRestored();
  };
}
