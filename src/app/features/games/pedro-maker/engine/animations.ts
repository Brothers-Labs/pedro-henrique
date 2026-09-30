import type * as Phaser from 'phaser';

import { PEDRO_FRAMES } from '../art/pedro-art';
import { enemyTexture, TEXTURES } from '../art/texture-catalog';
import type { EnemyKind } from '../models/level.model';

export const ANIMATIONS = {
  pedroIdle: 'pedro-idle',
  pedroRun: 'pedro-run',
  coinSpin: 'coin-spin',
  lava: 'lava-wave',
} as const;

export function enemyAnimation(kind: EnemyKind): string {
  return `enemy-${kind}-move`;
}

const ENEMIES: readonly EnemyKind[] = ['slime', 'spiky', 'bat', 'robot', 'ghost'];

/**
 * Animações da fase.
 *
 * O gerenciador de animações é do jogo inteiro, e cada partida redesenha as
 * texturas com o visual escolhido — por isso tudo é recriado a cada montagem.
 */
export function createAnimations(anims: Phaser.Animations.AnimationManager): void {
  const define = (key: string, texture: string, frames: readonly number[], frameRate: number): void => {
    if (anims.exists(key)) {
      anims.remove(key);
    }

    anims.create({
      key,
      frames: frames.map((frame) => ({ key: texture, frame })),
      frameRate,
      repeat: -1,
    });
  };

  define(ANIMATIONS.pedroIdle, TEXTURES.pedro, PEDRO_FRAMES.idle, 2.5);
  define(ANIMATIONS.pedroRun, TEXTURES.pedro, PEDRO_FRAMES.run, 12);
  define(ANIMATIONS.coinSpin, TEXTURES.coin, [0, 1, 2, 3], 8);
  define(ANIMATIONS.lava, TEXTURES.lava, [0, 1], 3);

  for (const kind of ENEMIES) {
    define(enemyAnimation(kind), enemyTexture(kind), [0, 1], kind === 'bat' ? 8 : 4);
  }
}
