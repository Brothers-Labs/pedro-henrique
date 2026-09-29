import * as Phaser from 'phaser';

import { THEME_PALETTES } from '../art/palettes';
import { GRAVITY, VIEW_HEIGHT, VIEW_WIDTH } from '../config/physics.config';
import type { GameLaunchOptions, MakerGameSession } from '../models/session.model';
import { BOOT_SCENE_KEY, BootScene } from './scenes/boot-scene';
import { GAME_SCENE_KEY, GameScene } from './scenes/game-scene';

/**
 * Cria uma partida do Pedro Maker dentro de um elemento da página.
 *
 * É a única porta de entrada do Phaser: quem chama recebe uma sessão com
 * pausa, retomada, recomeço e `destroy`, e nunca toca no motor diretamente.
 * Este módulo só é baixado quando alguém abre uma fase.
 */
export function launchMakerGame(options: GameLaunchOptions): MakerGameSession {
  const palette = THEME_PALETTES[options.blueprint.theme];
  const gameScene = new GameScene(options);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    backgroundColor: palette.skyBottom,
    banner: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: GRAVITY }, debug: false },
    },
    // O som é do Angular (Web Audio sintetizado); o Phaser não precisa abrir outro contexto.
    audio: { noAudio: true },
    render: { antialias: true, roundPixels: true, powerPreference: 'high-performance' },
    fps: { target: 60 },
    input: { gamepad: false },
    scene: [],
  });

  game.scene.add(BOOT_SCENE_KEY, new BootScene(options), true);
  game.scene.add(GAME_SCENE_KEY, gameScene, false);

  let isDestroyed = false;

  return {
    pause: () => {
      if (!isDestroyed && game.scene.isActive(GAME_SCENE_KEY)) {
        game.scene.pause(GAME_SCENE_KEY);
      }
    },
    resume: () => {
      if (!isDestroyed && game.scene.isPaused(GAME_SCENE_KEY)) {
        gameScene.releaseInput();
        game.scene.resume(GAME_SCENE_KEY);
      }
    },
    retryFromCheckpoint: () => {
      if (isDestroyed) {
        return;
      }

      gameScene.retryFromCheckpoint();
      game.scene.resume(GAME_SCENE_KEY);
    },
    restart: () => {
      if (!isDestroyed) {
        gameScene.scene.restart();
      }
    },
    destroy: () => {
      if (isDestroyed) {
        return;
      }

      isDestroyed = true;
      // `true` remove também o canvas da página e libera as texturas da GPU.
      game.destroy(true);
    },
  };
}
