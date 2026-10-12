import { MathUtils } from 'three';

import type { CharacterPalette } from '../../pedro-maker/config/character.config';
import type { QualitySettings } from '../../pedro-maker/engine/render/quality';
import { kartColor, RIVALS } from '../config/kart.config';
import type { TrackThemeDefinition } from '../config/theme.config';
import type { KartSetup } from '../models/kart.model';
import type { Kart } from '../simulation/kart';
import { RACE_STEP_MS, type RaceSimulation } from '../simulation/race-simulation';
import { ChaseCamera } from './chase-camera';
import { KartModel } from './kart-model';
import type { KartStage } from './kart-stage';
import { Minimap } from './minimap';
import { TrackView } from './track-view';

/** Desenho do mapinha a cada tantos quadros: o olho não percebe, e a tela agradece. */
const MINIMAP_EVERY_FRAMES = 3;

export interface RaceViewOptions {
  readonly kart: KartSetup;
  readonly driver: CharacterPalette;
  readonly minimap: HTMLCanvasElement | null;
  readonly seed: number;
}

/**
 * O desenho da corrida: lê a simulação e posiciona tudo na cena.
 *
 * Nunca muda a simulação. Entre dois passos da física, mistura a posição
 * anterior com a atual, e o kart desliza liso mesmo numa tela de 120 Hz.
 */
export class RaceView {
  private readonly track: TrackView;
  private readonly models = new Map<string, KartModel>();
  private readonly colors = new Map<string, string>();
  private readonly camera: ChaseCamera;
  private readonly minimap: Minimap | null;
  private frame = 0;

  constructor(
    private readonly stage: KartStage,
    private readonly race: RaceSimulation,
    theme: TrackThemeDefinition,
    quality: QualitySettings,
    options: RaceViewOptions,
  ) {
    this.track = new TrackView(race.circuit, theme, options.seed, quality.shadows);
    this.track.addItemBoxes(race.itemBoxes);
    stage.scene.add(this.track.root);

    for (const kart of race.karts) {
      const model = this.createModel(kart, options);

      this.models.set(kart.id, model);
      this.colors.set(kart.id, model.color);
      stage.scene.add(model.root);
    }

    this.camera = new ChaseCamera(stage.camera);
    this.camera.start(race.player.x, race.player.z, race.player.heading);
    this.minimap = options.minimap ? new Minimap(options.minimap, race.circuit, theme.road) : null;
  }

  render(alpha: number, frameMs: number): void {
    const deltaSeconds = frameMs / 1000;
    const now = performance.now();
    const clockMs = this.race.timeMs + alpha * RACE_STEP_MS;

    for (const kart of this.race.karts) {
      this.placeKart(kart, alpha, deltaSeconds, now);
    }

    const player = this.race.player;
    const playerX = MathUtils.lerp(player.previousX, player.x, alpha);
    const playerZ = MathUtils.lerp(player.previousZ, player.z, alpha);

    this.camera.update(playerX, playerZ, player.heading, player.isSpinning, deltaSeconds);
    this.stage.follow(playerX, playerZ);
    this.track.update(this.race.itemBoxes, this.race.peels, clockMs);

    this.frame += 1;

    if (this.minimap && this.frame % MINIMAP_EVERY_FRAMES === 0) {
      this.minimap.draw(this.race.karts, this.colors);
    }

    this.stage.render();
  }

  dispose(): void {
    this.track.dispose();

    for (const model of this.models.values()) {
      model.dispose();
    }

    this.models.clear();
  }

  private placeKart(kart: Kart, alpha: number, deltaSeconds: number, now: number): void {
    const model = this.models.get(kart.id);

    if (!model) {
      return;
    }

    const headingGap = Math.atan2(Math.sin(kart.heading - kart.previousHeading), Math.cos(kart.heading - kart.previousHeading));

    model.root.position.set(
      MathUtils.lerp(kart.previousX, kart.x, alpha),
      0,
      MathUtils.lerp(kart.previousZ, kart.z, alpha),
    );
    model.root.rotation.y = kart.previousHeading + headingGap * alpha;
    model.update(
      { speed: kart.speed, steer: kart.steer, isBoosting: kart.boostSeconds > 0, hasStar: kart.hasStar },
      deltaSeconds,
      now,
    );
  }

  private createModel(kart: Kart, options: RaceViewOptions): KartModel {
    if (kart.isPlayer) {
      return new KartModel(options.kart.body, kartColor(options.kart.color).hex, options.driver);
    }

    const rival = RIVALS.find((candidate) => candidate.id === kart.id);

    if (!rival) {
      throw new Error(`Adversário "${kart.id}" não existe na lista de pilotos.`);
    }

    return new KartModel(rival.setup.body, kartColor(rival.setup.color).hex, {
      hero: 'pedro',
      cap: rival.cap,
      shirt: rival.shirt,
      backpack: rival.shirt,
      backpackStyle: 'none',
    });
  }
}
