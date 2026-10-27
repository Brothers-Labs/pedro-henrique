import { Color, Fog, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';

import { QUALITY, type QualityTier } from '../../../pedro-maker/engine/render/quality';

/** Até onde a vista alcança em cada qualidade, em blocos: a névoa esconde o corte. */
const VIEW_DISTANCE: Readonly<Record<QualityTier, number>> = { alta: 88, media: 64, baixa: 44 };

const FIELD_OF_VIEW = 72;

/**
 * O palco do PedroCraft: renderizador, cena, câmera, céu e névoa.
 *
 * Vive a partida inteira. Sem sombras em tempo real: o volume dos blocos vem
 * da sombra gravada nos vértices, que custa zero a cada quadro.
 */
export class CraftStage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(FIELD_OF_VIEW, 16 / 9, 0.05, VIEW_DISTANCE.alta);
  readonly sky = new Color('#8fd0ff');

  private readonly fog: Fog;
  private readonly resizeObserver: ResizeObserver;
  private viewDistance = VIEW_DISTANCE.alta;

  constructor(
    private readonly parent: HTMLElement,
    tier: QualityTier,
  ) {
    this.renderer = new WebGLRenderer({ antialias: tier !== 'baixa', powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = SRGBColorSpace;

    const canvas = this.renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
    canvas.setAttribute('aria-hidden', 'true');
    parent.appendChild(canvas);

    this.camera.rotation.order = 'YXZ';
    this.fog = new Fog(this.sky, this.viewDistance * 0.55, this.viewDistance);
    this.scene.fog = this.fog;
    this.scene.background = this.sky;
    this.scene.add(this.camera);

    this.applyQuality(tier);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(parent);
    this.resize();
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  applyQuality(tier: QualityTier): void {
    this.viewDistance = VIEW_DISTANCE[tier];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY[tier].pixelRatio));
    this.camera.far = this.viewDistance;
    this.camera.updateProjectionMatrix();
    this.setFog(this.sky, 0.55, 1);
  }

  /**
   * Cor do céu e névoa.
   *
   * `near` e `far` são frações da distância de vista: debaixo d'água a névoa
   * azul chega perto, e o mundo some logo ali.
   */
  setFog(color: Color, near: number, far: number): void {
    this.fog.color.copy(color);
    this.fog.near = this.viewDistance * near;
    this.fog.far = this.viewDistance * far;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  private resize(): void {
    const width = Math.max(1, this.parent.clientWidth);
    const height = Math.max(1, this.parent.clientHeight);

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
