import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Material,
  Mesh,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PointLight,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

import { context2d, createCanvas } from '../../art/canvas';
import type { ThemePalette } from '../../art/palettes';
import type { LevelTheme } from '../../models/level.model';
import { QUALITY, type QualitySettings, type QualityTier } from './quality';

/**
 * Onde o sol fica em relação ao ponto que a câmera olha: alto, um pouco à
 * esquerda e bem à frente — assim o rosto do Pedro fica iluminado para os
 * dois lados em que ele olha, e a sombra ainda cai para trás e para a direita.
 */
const SUN_OFFSET = { x: -4, y: 15, z: 16 } as const;

/** Luz suave vinda da câmera: tira o escuro das faces de lado, sem sombra e sem custo. */
const FILL_INTENSITY = 0.55;

/** Metade do quadrado coberto pela sombra, em blocos, em volta do Pedro. */
const SHADOW_EXTENT = 16;

/** Luz do sol por tema: o vulcão é avermelhado, a caverna quase não tem sol. */
const SUN_COLORS: Readonly<Partial<Record<LevelTheme, string>>> = {
  vulcao: '#ffb08a',
  deserto: '#fff1d6',
  gelo: '#eef8ff',
  estrelas: '#c9b8ff',
  castelo: '#d9d4ff',
  'castelo-rei-slime': '#e3ffd6',
  praia: '#fff1d6',
  classico: '#fffaf0',
  // Luar arroxeado.
  'dia-das-bruxas': '#c9b8ff',
};

/**
 * O palco do jogo: renderizador, cena, câmera e luzes.
 *
 * Vive a partida inteira. Recomeçar a fase troca só o que está em cena, sem
 * recriar o contexto da placa de vídeo — o navegador tem um limite deles, e
 * criar e destruir a cada tentativa acabaria estourando.
 */
export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(38, 16 / 9, 0.5, 220);
  readonly sun: DirectionalLight;
  /** Luz que acompanha o Pedro nos temas escuros, como uma lanterna. */
  readonly playerLight: PointLight | null;

  private readonly skyTexture: CanvasTexture;
  private readonly resizeObserver: ResizeObserver;
  private quality: QualitySettings;
  private width = 1;
  private height = 1;

  constructor(
    private readonly parent: HTMLElement,
    theme: LevelTheme,
    palette: ThemePalette,
    tier: QualityTier,
  ) {
    this.quality = QUALITY[tier];
    this.renderer = new WebGLRenderer({
      antialias: tier !== 'baixa',
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    const canvas = this.renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
    canvas.setAttribute('aria-hidden', 'true');
    parent.appendChild(canvas);

    this.skyTexture = paintSky(palette);
    this.scene.background = this.skyTexture;
    this.scene.fog = new Fog(new Color(palette.skyBottom), 30, 95);

    const hemisphere = new HemisphereLight(new Color(palette.skyTop), new Color(palette.soilDark), palette.isDark ? 0.55 : 1.25);
    this.scene.add(hemisphere);

    this.sun = new DirectionalLight(new Color(SUN_COLORS[theme] ?? '#ffffff'), palette.isDark ? 0.5 : 2.4);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.camera.left = -SHADOW_EXTENT;
    this.sun.shadow.camera.right = SHADOW_EXTENT;
    this.sun.shadow.camera.top = SHADOW_EXTENT;
    this.sun.shadow.camera.bottom = -SHADOW_EXTENT;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 60;
    this.scene.add(this.sun, this.sun.target);

    // Presa à câmera, a luz de preenchimento acompanha qualquer ponto da fase.
    const fill = new DirectionalLight(new Color('#ffffff'), palette.isDark ? FILL_INTENSITY * 0.5 : FILL_INTENSITY);
    fill.position.set(0, 0.4, 1);
    fill.target.position.set(0, 0, -1);
    this.camera.add(fill, fill.target);
    this.scene.add(this.camera);

    this.playerLight = palette.isDark ? new PointLight(new Color('#ffe2a8'), 40, 11, 1.6) : null;

    if (this.playerLight) {
      this.scene.add(this.playerLight);
    }

    this.applyQuality(tier);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(parent);
    this.resize();
  }

  get aspect(): number {
    return this.width / this.height;
  }

  get qualitySettings(): QualitySettings {
    return this.quality;
  }

  applyQuality(tier: QualityTier): void {
    const quality = QUALITY[tier];
    const shadowsChanged = quality.shadows !== this.renderer.shadowMap.enabled;

    this.quality = quality;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatio));
    this.renderer.shadowMap.enabled = quality.shadows;
    this.sun.castShadow = quality.shadows;
    this.sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;

    if (shadowsChanged) {
      // Ligar ou desligar sombra muda o programa dos materiais: eles precisam recompilar.
      this.scene.traverse((object) => markMaterialsForUpdate(object));
    }

    this.resize();
  }

  /** O sol e a lanterna seguem o ponto que a câmera olha, para a sombra ficar sempre nítida. */
  follow(x: number, y: number): void {
    this.sun.position.set(x + SUN_OFFSET.x, y + SUN_OFFSET.y, SUN_OFFSET.z);
    this.sun.target.position.set(x, y, 0);
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

    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}

function markMaterialsForUpdate(object: Object3D): void {
  if (!(object instanceof Mesh)) {
    return;
  }

  const materials: readonly Material[] = Array.isArray(object.material) ? object.material : [object.material];

  for (const material of materials) {
    material.needsUpdate = true;
  }
}

/** Céu em degradê, do tom de cima para o do horizonte. */
function paintSky(palette: ThemePalette): CanvasTexture {
  const canvas = createCanvas(2, 256);
  const context = context2d(canvas);
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);

  gradient.addColorStop(0, palette.skyTop);
  gradient.addColorStop(1, palette.skyBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;

  return texture;
}
