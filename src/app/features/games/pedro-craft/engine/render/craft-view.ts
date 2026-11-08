import { Color } from 'three';

import type { QualityTier } from '../../../pedro-maker/engine/render/quality';
import { nextTask } from '../next-task';
import type { CraftSimulation } from '../simulation/craft-simulation';
import { BlockAtlas } from './block-atlas';
import type { CraftStage } from './craft-stage';
import { CreaturesView } from './creatures-view';
import { DropsView } from './drops-view';
import { FusesView } from './fuses-view';
import { HandView } from './hand-view';
import { ItemTextures } from './item-textures';
import { ParticlesView } from './particles-view';
import { ProjectilesView } from './projectiles-view';
import { TargetView } from './target-view';
import { TrainView } from './train-view';
import { createDaylightUniform, type DaylightUniform } from './voxel-material';
import { WeatherView } from './weather-view';
import { WorldView } from './world-view';

/** Chunks montados de uma vez na carga, entre uma pausa e outra para a barra de progresso andar. */
const CHUNKS_PER_LOADING_BATCH = 4;

const UNDERWATER_COLOR = new Color('#1f5f9e');

/** O estouro: fogo e fumaça em nuvens espalhadas pelo meio do buraco. */
const EXPLOSION_COLORS = ['#ff8c1a', '#ffd23f', '#9a9aa5', '#e8e8f0'] as const;
const EXPLOSION_PUFFS = 8;

/** O céu do meio do dia e o da noite funda; no crepúsculo, a cor passa de um para o outro. */
const DAY_SKY = new Color('#8fd0ff');
const NIGHT_SKY = new Color('#1e2a5c');

/** A noite é azulada e enxergável de propósito: escuridão total assusta. */
const DAY_LIGHT = new Color(1, 1, 1);
const NIGHT_LIGHT = new Color(0.42, 0.48, 0.72);

/** Com chuva, o céu fica cinza-azulado e o mundo um pouco mais escuro, sem ficar triste. */
const RAIN_SKY = new Color('#8c9db3');
const RAIN_DIMMING = 0.85;
const RAIN_SKY_MIX = 0.55;

/**
 * Tudo o que se vê: o céu, o mundo de blocos, os bichos, o trem, as flechas, os itens caídos, a mira e a mão.
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
  private readonly trainView: TrainView;
  private readonly fusesView: FusesView;
  private readonly projectilesView: ProjectilesView;
  private readonly weatherView: WeatherView;
  private readonly targetView: TargetView;
  private readonly handView: HandView;
  private readonly particles: ParticlesView;
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
    this.trainView = new TrainView(stage.scene, this.daylight);
    this.fusesView = new FusesView(stage.scene);
    this.projectilesView = new ProjectilesView(stage.scene);
    this.weatherView = new WeatherView(stage.scene);
    this.atlas.applyPalette(simulation.calendar.season.palette);
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

  /** Modo calmo e movimento reduzido apagam a poeira dos blocos e trocam o pisca-pisca dos avisos por um brilho parado. */
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
    this.updateSky();
    this.worldView.rebuild();
    this.dropsView.update(simulation.drops.list);
    this.creaturesView.update(simulation.creatures.list, alpha, frameMs, !this.effectsEnabled);
    this.trainView.update(simulation.train, alpha);
    this.fusesView.update(simulation.explosions.lit, !this.effectsEnabled);
    this.projectilesView.update(simulation.projectiles.list, alpha);
    this.weatherView.update(simulation.weather.current, camera.position, frameMs, !this.effectsEnabled);
    this.targetView.update(simulation.target, simulation.miningProgress);
    this.handView.update(simulation.selectedItem?.id ?? null, simulation.mining !== null, frameMs);
    this.particles.update(frameMs);
    this.stage.render();
  }

  applyQuality(tier: QualityTier): void {
    this.stage.applyQuality(tier);
  }

  dispose(): void {
    this.worldView.dispose();
    this.dropsView.dispose();
    this.creaturesView.dispose();
    this.trainView.dispose();
    this.fusesView.dispose();
    this.projectilesView.dispose();
    this.weatherView.dispose();
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
        case 'season-changed':
          this.atlas.applyPalette(this.simulation.calendar.season.palette);
          break;
        case 'sparkle':
        case 'creature-poof':
          if (this.effectsEnabled) {
            // A nuvem nasce centrada no animal; `burst` espalha a partir do canto de uma célula.
            this.particles.burst(event.x - 0.5, event.y, event.z - 0.5, event.color);
          }
          break;
        case 'explosion':
          if (this.effectsEnabled) {
            this.burstExplosion(event.x, event.y, event.z, event.radius);
          }
          break;
      }
    }
  }

  private burstExplosion(x: number, y: number, z: number, radius: number): void {
    const spread = radius / 2;

    for (let puff = 0; puff < EXPLOSION_PUFFS; puff += 1) {
      const color = EXPLOSION_COLORS[puff % EXPLOSION_COLORS.length];

      this.particles.burst(x - 0.5 + (Math.random() - 0.5) * spread, y - 0.5 + Math.random() * spread, z - 0.5 + (Math.random() - 0.5) * spread, color);
    }
  }

  /**
   * O céu e a luz seguem o relógio; debaixo d'água o mundo fica azul e a
   * vista curta, como num mergulho de verdade.
   */
  private updateSky(): void {
    const daylight = this.simulation.clock.daylight;

    this.daylight.value.copy(NIGHT_LIGHT).lerp(DAY_LIGHT, daylight);
    this.stage.sky.copy(NIGHT_SKY).lerp(DAY_SKY, daylight);

    if (this.simulation.weather.isRaining) {
      this.daylight.value.multiplyScalar(RAIN_DIMMING);
      this.stage.sky.lerp(RAIN_SKY, RAIN_SKY_MIX * daylight);
    }

    if (this.simulation.isEyeUnderwater) {
      this.stage.setFog(UNDERWATER_COLOR, 0, 0.18);
    } else {
      this.stage.setFog(this.stage.sky, 0.55, 1);
    }
  }
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
