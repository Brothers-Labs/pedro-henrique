import * as Phaser from 'phaser';

import { textureSpecsFor } from '../../art/texture-catalog';
import { paletteFor } from '../../config/character.config';
import type { GameLaunchOptions } from '../../models/session.model';
import { registerTexture } from '../textures';
import { GAME_SCENE_KEY } from './game-scene';

export const BOOT_SCENE_KEY = 'pedro-maker-boot';

/** Tempo de desenho por quadro: a barra anda e a página não congela. */
const FRAME_BUDGET_MS = 12;

/**
 * Carregamento: desenha as texturas da fase, algumas por quadro.
 *
 * Não há download — tudo é pintado em código —, mas pintar cem texturas de
 * uma vez travaria a tela do celular por um instante. Fatiando, a barra de
 * "Preparando a aventura" anda de verdade.
 */
export class BootScene extends Phaser.Scene {
  constructor(private readonly options: GameLaunchOptions) {
    super({ key: BOOT_SCENE_KEY });
  }

  create(): void {
    const specs = textureSpecsFor({
      theme: this.options.blueprint.theme,
      character: paletteFor(this.options.look),
      boss: this.options.blueprint.boss,
    });
    let next = 0;

    const timer = this.time.addEvent({
      delay: 1,
      loop: true,
      callback: () => {
        const startedAt = performance.now();

        while (next < specs.length && performance.now() - startedAt < FRAME_BUDGET_MS) {
          registerTexture(this.textures, specs[next]);
          next += 1;
        }

        this.options.listener({ type: 'loading', progress: next / specs.length });

        if (next >= specs.length) {
          timer.remove();
          this.scene.start(GAME_SCENE_KEY);
        }
      },
    });
  }
}
