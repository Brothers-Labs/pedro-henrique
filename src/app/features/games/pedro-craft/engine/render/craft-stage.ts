import { Color, Fog, PerspectiveCamera, Scene, SRGBColorSpace, Vector2, WebGLRenderer } from 'three';

import { QUALITY, type QualityTier } from '../../../pedro-maker/engine/render/quality';

/** Até onde a vista alcança em cada qualidade, em blocos: a névoa esconde o corte. */
const VIEW_DISTANCE: Readonly<Record<QualityTier, number>> = { alta: 88, media: 64, baixa: 44 };

const FIELD_OF_VIEW = 72;

/**
 * Camada que só a câmera de cada jogador desenha: a mão dele. A camada 0 é
 * o mundo, que todas as câmeras desenham.
 */
export const PLAYER_VIEW_LAYERS = [1, 2, 3] as const;

/**
 * Camada do corpo de cada jogador: a câmera dele não desenha (ficaria por
 * dentro da cabeça), a dos outros desenha. Com três jogadores, uma camada só
 * por vista não bastaria: o corpo do Jogador 1 precisa aparecer em duas.
 */
export const AVATAR_LAYERS = [4, 5, 6] as const;

/** Quantas crianças a tela divide: uma, duas lado a lado ou três em quatro quartos. */
export type StagePlayerCount = 1 | 2 | 3;

/** Um pedaço da tela, em pixels, a partir do canto de baixo à esquerda, como o WebGL conta. */
export interface StageViewport {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Onde cada jogador aparece na tela.
 *
 * Com dois, a tela divide ao meio: Jogador 1 à esquerda, Jogador 2 à
 * direita. Com três, ela divide em quatro quartos, como nos jogos de corrida
 * de sofá: Jogadores 1 e 2 em cima, Jogador 3 embaixo à esquerda, e o quarto
 * de baixo à direita fica para a tela mostrar o nome do mundo. Cada vista tem
 * o formato da tela inteira, e ninguém fica com uma faixa esticada e torta.
 */
export function playerViewports(count: StagePlayerCount, width: number, height: number): readonly StageViewport[] {
  const columns = count === 1 ? 1 : 2;
  const rows = count === 3 ? 2 : 1;

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = Math.floor((column * width) / columns);
    const right = Math.floor(((column + 1) * width) / columns);
    // A linha 0 é a de cima; o WebGL conta a altura a partir de baixo.
    const top = Math.floor((row * height) / rows);
    const bottom = Math.floor(((row + 1) * height) / rows);

    return { x: left, y: height - bottom, width: right - left, height: bottom - top };
  });
}

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
  /** Uma câmera por jogador, na ordem de `playerViewports`. */
  readonly cameras: PerspectiveCamera[] = [this.camera];
  readonly sky = new Color('#8fd0ff');
  private readonly size = new Vector2();

  private readonly fog: Fog;
  private readonly resizeObserver: ResizeObserver;
  private viewDistance = VIEW_DISTANCE.alta;
  private playerCount: StagePlayerCount = 1;

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

  /**
   * Com 2 ou 3, ganha a câmera de cada jogador a mais e a tela divide. Cada
   * câmera desenha a própria mão e o corpo dos outros jogadores.
   */
  setPlayerCount(count: StagePlayerCount): void {
    if (count <= this.cameras.length) {
      return;
    }

    while (this.cameras.length < count) {
      const camera = new PerspectiveCamera(FIELD_OF_VIEW, this.camera.aspect, this.camera.near, this.camera.far);

      camera.rotation.order = 'YXZ';
      camera.layers.enable(PLAYER_VIEW_LAYERS[this.cameras.length]);
      this.scene.add(camera);
      this.cameras.push(camera);
    }

    this.playerCount = count;
    this.cameras.forEach((camera, index) => {
      AVATAR_LAYERS.slice(0, count).forEach((layer, owner) => {
        if (owner !== index) {
          camera.layers.enable(layer);
        }
      });
    });
    this.resize();
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

    const viewports = playerViewports(this.playerCount, this.size.x, this.size.y);

    this.renderer.setScissorTest(true);

    this.cameras.forEach((camera, index) => {
      const { x, y, width, height } = viewports[index];

      this.renderer.setViewport(x, y, width, height);
      this.renderer.setScissor(x, y, width, height);
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

    const viewports = playerViewports(this.playerCount, width, height);

    this.cameras.forEach((camera, index) => {
      const viewport = viewports[index];

      camera.aspect = Math.max(1, viewport.width) / Math.max(1, viewport.height);
      camera.updateProjectionMatrix();
    });
  }
}
