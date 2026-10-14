import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  PCFShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  type Texture,
  Vector2,
  WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { context2d, createCanvas } from '../../pedro-maker/art/canvas';
import { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import { QUALITY, type QualityTier } from '../../pedro-maker/engine/render/quality';
import type { FlashThemeDefinition } from '../config/theme.config';

/** Onde o sol fica em relação ao Pedro: alto e de lado, para a sombra cair perto dele. */
const SUN_OFFSET = { x: -22, y: 46, z: 14 } as const;
const SHADOW_EXTENT = 36;
const FOG_NEAR = 120;
const FOG_FAR = 560;

/** O brilho realça o que é mais claro que o limiar: as luzes de neon, os raios e o rastro. */
const BLOOM = {
  dark: { strength: 0.55, radius: 0.35, threshold: 0.72 },
  light: { strength: 0.35, radius: 0.3, threshold: 0.95 },
} as const;

/** Relâmpago na tempestade: um clarão curto, de tempos em tempos. */
const LIGHTNING = { minimumGapMs: 2800, extraGapMs: 4200, durationMs: 220, boost: 2.6 } as const;

/**
 * O palco do Pedro Flash: renderizador, cena, câmera, luzes e acabamento.
 *
 * É primo do palco do Pedro Kart, com dois acabamentos a mais na qualidade
 * alta: o brilho (bloom), que faz o neon e os raios acenderem de verdade, e
 * o reflexo do ambiente nas peças de metal dos robôs. Em aparelhos mais
 * fracos os dois saem antes da sombra.
 */
export class FlashStage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(70, 16 / 9, 0.3, 900);
  readonly sun: DirectionalLight;

  private readonly hemisphere: HemisphereLight;
  private readonly baseHemisphereIntensity: number;
  private readonly skyTexture: CanvasTexture;
  private readonly resizeObserver: ResizeObserver;
  private readonly lightningRandom: SeededRandom;
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private environment: Texture | null = null;
  private nextLightningAt: number = LIGHTNING.minimumGapMs;
  private lightningUntil = 0;
  /** Tela em pé: a câmera abre mais o ângulo. */
  private isPortrait = false;

  constructor(
    private readonly parent: HTMLElement,
    private readonly theme: FlashThemeDefinition,
    tier: QualityTier,
    seed: number,
  ) {
    this.renderer = new WebGLRenderer({ antialias: tier !== 'baixa', powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = theme.isDark ? 1.15 : 1;
    this.renderer.shadowMap.type = PCFShadowMap;

    const canvas = this.renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
    canvas.setAttribute('aria-hidden', 'true');
    parent.appendChild(canvas);

    this.lightningRandom = new SeededRandom(seed);
    this.skyTexture = paintSky(theme);
    this.scene.background = this.skyTexture;
    this.scene.fog = new Fog(new Color(theme.skyBottom), FOG_NEAR, FOG_FAR);
    this.baseHemisphereIntensity = theme.isDark ? 1.0 : 1.35;
    this.hemisphere = new HemisphereLight(new Color(theme.skyTop), new Color(theme.ground), this.baseHemisphereIntensity);
    this.scene.add(this.hemisphere);

    this.sun = new DirectionalLight(new Color(theme.sun), theme.isDark ? 1.2 : 2.4);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.camera.left = -SHADOW_EXTENT;
    this.sun.shadow.camera.right = SHADOW_EXTENT;
    this.sun.shadow.camera.top = SHADOW_EXTENT;
    this.sun.shadow.camera.bottom = -SHADOW_EXTENT;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 140;
    this.scene.add(this.sun, this.sun.target);

    this.applyQuality(tier);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(parent);
    this.resize();
  }

  /** Abertura de câmera base: na tela em pé o Pedro some de tão estreito, então ela abre mais. */
  get baseFov(): number {
    return this.isPortrait ? 82 : 68;
  }

  applyQuality(tier: QualityTier): void {
    const quality = QUALITY[tier];

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatio));
    this.renderer.shadowMap.enabled = quality.shadows;
    this.sun.castShadow = quality.shadows;
    this.sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.setEnvironment(tier !== 'baixa');
    this.setBloom(tier === 'alta');
    this.resize();
  }

  follow(x: number, y: number, z: number): void {
    this.sun.position.set(x + SUN_OFFSET.x, y + SUN_OFFSET.y, z + SUN_OFFSET.z);
    this.sun.target.position.set(x, y, z);
  }

  render(now: number): void {
    this.updateLightning(now);

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.setBloom(false);
    this.setEnvironment(false);
    this.skyTexture.dispose();
    this.sun.shadow.map?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  private setBloom(isEnabled: boolean): void {
    if (!isEnabled) {
      this.bloom?.dispose();
      this.composer?.dispose();
      this.bloom = null;
      this.composer = null;
      return;
    }

    if (this.composer) {
      return;
    }

    const settings = this.theme.isDark ? BLOOM.dark : BLOOM.light;
    const size = this.renderer.getSize(new Vector2());

    this.composer = new EffectComposer(this.renderer);
    this.bloom = new UnrealBloomPass(size, settings.strength, settings.radius, settings.threshold);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  /** Reflexo de uma sala clara nas peças de metal: os robôs ganham brilho de metal de verdade. */
  private setEnvironment(isEnabled: boolean): void {
    if (!isEnabled) {
      this.environment?.dispose();
      this.environment = null;
      this.scene.environment = null;
      return;
    }

    if (this.environment) {
      return;
    }

    const generator = new PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();

    this.environment = generator.fromScene(room, 0.04).texture;
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = this.theme.isDark ? 0.35 : 0.5;
    room.dispose();
    generator.dispose();
  }

  private updateLightning(now: number): void {
    if (!this.theme.hasLightning) {
      return;
    }

    if (now >= this.nextLightningAt) {
      this.lightningUntil = now + LIGHTNING.durationMs;
      this.nextLightningAt = now + LIGHTNING.minimumGapMs + this.lightningRandom.next() * LIGHTNING.extraGapMs;
    }

    const isFlashing = now < this.lightningUntil;
    // Dois piscos dentro do clarão, como um relâmpago de verdade.
    const flicker = isFlashing && Math.floor((this.lightningUntil - now) / 55) % 2 === 0;

    this.hemisphere.intensity = this.baseHemisphereIntensity * (flicker ? LIGHTNING.boost : 1);
  }

  private resize(): void {
    const width = Math.max(1, this.parent.clientWidth);
    const height = Math.max(1, this.parent.clientHeight);

    this.isPortrait = width < height;
    this.renderer.setSize(width, height, false);
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.composer?.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}

/** Céu em degradê; nos cenários escuros, salpicado de estrelas. */
function paintSky(theme: FlashThemeDefinition): CanvasTexture {
  const canvas = createCanvas(512, 512);
  const context = context2d(canvas);
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);

  gradient.addColorStop(0, theme.skyTop);
  gradient.addColorStop(0.75, theme.skyBottom);
  gradient.addColorStop(1, theme.skyBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (theme.isDark) {
    for (let index = 0; index < 220; index += 1) {
      // Posições fixas (sem sorteio): o céu é o mesmo em toda partida.
      const x = (index * 97) % canvas.width;
      const y = (index * 53) % (canvas.height * 0.65);
      const size = starSize(index);

      context.fillStyle = index % 11 === 0 ? theme.neon : '#ffffff';
      context.globalAlpha = 0.5 + (index % 5) * 0.1;
      context.fillRect(x, y, size, size);
    }

    context.globalAlpha = 1;
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;

  return texture;
}

/** Uma estrela grande a cada nove, uma média a cada três; o resto, pontinhos. */
function starSize(index: number): number {
  if (index % 9 === 0) {
    return 2.5;
  }

  return index % 3 === 0 ? 1.6 : 1;
}
