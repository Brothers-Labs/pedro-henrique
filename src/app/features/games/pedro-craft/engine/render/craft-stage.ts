import { Color, Fog, PerspectiveCamera, Scene, SRGBColorSpace, Vector2, WebGLRenderer } from 'three';

import { QUALITY, type QualityTier } from '../../../pedro-maker/engine/render/quality';

/** Até onde a vista alcança em cada qualidade, em blocos: a névoa esconde o corte. */
const VIEW_DISTANCE: Readonly<Record<QualityTier, number>> = { alta: 88, media: 64, baixa: 44 };

const FIELD_OF_VIEW = 72;

/**
 * Camada que só a câmera de cada jogador desenha: a mão dele e o corpo do
 * outro jogador. A camada 0 é o mundo, que as duas câmeras desenham.
 */
export const PLAYER_VIEW_LAYERS = [1, 2] as const;

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
  /** Uma câmera por jogador; com dois, a tela divide ao meio, Jogador 1 à esquerda. */
  readonly cameras: PerspectiveCamera[] = [this.camera];
  readonly sky = new Color('#8fd0ff');
  private readonly size = new Vector2();

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
    this.camera.layers.enable(PLAYER_VIEW_LAYERS[0]);
    this.fog = new Fog(this.sky, this.viewDistance * 0.55, this.viewDistance);
    this.scene.fog = this.fog;
    this.scene.background = this.sky;
    this.scene.add(this.camera);

    this.applyQuality(tier);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(parent);
    this.resize();
  }

  /** Com 2, ganha a câmera do Jogador 2 e a tela divide ao meio. */
  setPlayerCount(count: 1 | 2): void {
    if (count === 2 && this.cameras.length === 1) {
      const partner = new PerspectiveCamera(FIELD_OF_VIEW, this.camera.aspect, this.camera.near, this.camera.far);

      partner.rotation.order = 'YXZ';
      partner.layers.enable(PLAYER_VIEW_LAYERS[1]);
      this.scene.add(partner);
      this.cameras.push(partner);
      this.resize();
    }
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  applyQuality(tier: QualityTier): void {
    this.viewDistance = VIEW_DISTANCE[tier];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY[tier].pixelRatio));
    for (const camera of this.cameras) {
      camera.far = this.viewDistance;
      camera.updateProjectionMatrix();
    }

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

  /**
   * Desenha a vista de cada jogador. `beforeView` acerta o que muda de uma
   * vista para a outra (a névoa de quem está debaixo d'água).
   */
  render(beforeView: (index: number) => void = () => undefined): void {
    if (this.cameras.length === 1) {
      beforeView(0);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.renderer.getSize(this.size);

    const width = Math.floor(this.size.x / this.cameras.length);

    this.renderer.setScissorTest(true);

    this.cameras.forEach((camera, index) => {
      this.renderer.setViewport(index * width, 0, width, this.size.y);
      this.renderer.setScissor(index * width, 0, width, this.size.y);
      beforeView(index);
      this.renderer.render(this.scene, camera);
    });

    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.size.x, this.size.y);
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

    for (const camera of this.cameras) {
      camera.aspect = width / this.cameras.length / height;
      camera.updateProjectionMatrix();
    }
  }
}
