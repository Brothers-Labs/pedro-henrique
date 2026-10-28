import { Color } from 'three';

import type { QualityTier } from '../../../pedro-maker/engine/render/quality';
import { nextTask } from '../next-task';
import type { CraftSimulation } from '../simulation/craft-simulation';
import { BlockAtlas } from './block-atlas';
import type { CraftStage } from './craft-stage';
import { CreaturesView } from './creatures-view';
import { DropsView } from './drops-view';
import { HandView } from './hand-view';
import { ItemTextures } from './item-textures';
import { ParticlesView } from './particles-view';
import { TargetView } from './target-view';
import { createDaylightUniform, type DaylightUniform } from './voxel-material';
import { WorldView } from './world-view';

/** Chunks montados de uma vez na carga, entre uma pausa e outra para a barra de progresso andar. */
const CHUNKS_PER_LOADING_BATCH = 4;

const UNDERWATER_COLOR = new Color('#1f5f9e');

/**
 * Tudo o que se vê: o mundo de blocos, os animais, os itens caídos, a mira e a mão.
 *
 * Só lê a simulação. A câmera fica entre a posição do passo anterior e a do
 * atual (`alpha`), o que deixa o movimento liso mesmo com a tela mais rápida
 * que a física.
 */
export class CraftView {
  readonly daylight: DaylightUniform = createDaylightUniform();

  private readonly atlas: BlockAtlas;
  private readonly worldView: WorldView;
  private readonly itemTextures: ItemTextures;
  private readonly dropsView: DropsView;
  private readonly creaturesView: CreaturesView;
  private readonly targetView: TargetView;
  private readonly handView: HandView;
  private readonly particles: ParticlesView;
  private wasUnderwater = false;
  private effectsEnabled = true;

  constructor(
    private readonly stage: CraftStage,
    private readonly simulation: CraftSimulation,
  ) {
    this.atlas = new BlockAtlas(simulation.catalog);
    this.worldView = new WorldView(
      stage.scene,
      simulation.world,
      simulation.properties,
      this.atlas,
      this.daylight,
      simulation.catalog.world.chunkSize,
      (x, y, z) => simulation.farm.stageAt(x, y, z),
    );
    this.itemTextures = new ItemTextures(simulation.catalog);
    this.dropsView = new DropsView(stage.scene, this.itemTextures);
    this.creaturesView = new CreaturesView(stage.scene, this.daylight);
    this.targetView = new TargetView(stage.scene);
    this.handView = new HandView(stage.camera, this.itemTextures);
    this.particles = new ParticlesView(stage.scene);
  }

  /** Monta todas as malhas, avisando o progresso de 0 a 1 e cedendo a vez à página entre lotes. */
  async build(onProgress: (progress: number) => void): Promise<void> {
    const total = this.worldView.chunkCount;

    while (this.worldView.rebuild(CHUNKS_PER_LOADING_BATCH) > 0) {
      onProgress(1 - this.worldView.pendingChunks / total);
      await nextTask();
    }

    onProgress(1);
  }

  /** Modo calmo e movimento reduzido apagam a poeira dos blocos. */
  setEffectsEnabled(isEnabled: boolean): void {
    this.effectsEnabled = isEnabled;
  }

  render(alpha: number, frameMs: number): void {
    const simulation = this.simulation;
    const hero = simulation.hero;
    const body = hero.body;
    const camera = this.stage.camera;

    camera.position.set(
      lerp(hero.previousX, body.x, alpha),
      lerp(hero.previousY, body.y, alpha) + (hero.eyeY - body.y),
      lerp(hero.previousZ, body.z, alpha),
    );
    camera.rotation.set(hero.pitch, hero.yaw, 0);

    this.applyVisualEvents();
    this.updateUnderwater();
    this.worldView.rebuild();
    this.dropsView.update(simulation.drops.list);
    this.creaturesView.update(simulation.creatures.list, alpha, frameMs);
    this.targetView.update(simulation.target, simulation.miningProgress);
    this.handView.update(simulation.selectedItem?.id ?? null, simulation.mining !== null, frameMs);
    this.particles.update(frameMs);
    this.stage.render();
  }

  applyQuality(tier: QualityTier): void {
    this.stage.applyQuality(tier);
    this.wasUnderwater = false;
  }

  dispose(): void {
    this.worldView.dispose();
    this.dropsView.dispose();
    this.creaturesView.dispose();
    this.targetView.dispose();
    this.handView.dispose();
    this.particles.dispose();
    this.itemTextures.dispose();
    this.atlas.dispose();
  }

  private applyVisualEvents(): void {
    for (const event of this.simulation.drainVisualEvents()) {
      switch (event.type) {
        case 'swing':
          this.handView.swing();
          break;
        case 'block-broken':
          if (this.effectsEnabled) {
            const block = this.simulation.catalog.blockAt(event.block);

            this.particles.burst(event.x, event.y, event.z, block?.mapColor ?? '#8f969e');
          }
          break;
        case 'crop-grew':
          this.worldView.markCell(event.x, event.y, event.z);
          break;
        case 'creature-defeated':
          if (this.effectsEnabled) {
            // A nuvem nasce centrada no animal; `burst` espalha a partir do canto de uma célula.
            this.particles.burst(event.x - 0.5, event.y, event.z - 0.5, event.color);
          }
          break;
      }
    }
  }

  /** Debaixo d'água o mundo fica azul e a vista curta, como num mergulho de verdade. */
  private updateUnderwater(): void {
    const isUnderwater = this.simulation.isEyeUnderwater;

    if (isUnderwater === this.wasUnderwater) {
      return;
    }

    this.wasUnderwater = isUnderwater;

    if (isUnderwater) {
      this.stage.setFog(UNDERWATER_COLOR, 0, 0.18);
    } else {
      this.stage.setFog(this.stage.sky, 0.55, 1);
    }
  }
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
