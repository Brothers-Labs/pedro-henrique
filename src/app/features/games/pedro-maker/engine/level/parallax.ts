import type * as Phaser from 'phaser';

import { CLOUD_LAYER_HEIGHT, FAR_LAYER_HEIGHT, MID_LAYER_HEIGHT } from '../../art/background-art';
import type { ThemePalette } from '../../art/palettes';
import { TEXTURES } from '../../art/texture-catalog';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../../config/physics.config';
import { DEPTH } from '../effects';

/** Quanto cada camada anda em relação à câmera: o que está longe anda menos. */
const FAR_FACTOR = 0.12;
const CLOUD_FACTOR = 0.25;
const MID_FACTOR = 0.45;
const CLOUD_DRIFT_PER_SECOND = 6;

/** Ampliação da penumbra da caverna: a textura é pequena, a sombra cobre a tela. */
const SPOTLIGHT_SCALE = 5;

/**
 * Fundo em camadas.
 *
 * Todas ficam presas à tela e só deslizam a textura, na velocidade da sua
 * distância — é o que cria profundidade sem nenhum objeto a mais no mundo.
 */
export class Parallax {
  private readonly far: Phaser.GameObjects.TileSprite;
  private readonly mid: Phaser.GameObjects.TileSprite;
  private readonly clouds: Phaser.GameObjects.TileSprite | null;
  private readonly darkness: Phaser.GameObjects.Image | null;
  private cloudDrift = 0;

  constructor(scene: Phaser.Scene, palette: ThemePalette) {
    scene.add.image(0, 0, TEXTURES.sky).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.sky);

    this.far = scene.add
      .tileSprite(0, VIEW_HEIGHT - FAR_LAYER_HEIGHT - 70, VIEW_WIDTH, FAR_LAYER_HEIGHT, TEXTURES.far)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.far);

    this.clouds = palette.hasClouds
      ? scene.add
          .tileSprite(0, 30, VIEW_WIDTH, CLOUD_LAYER_HEIGHT, TEXTURES.clouds)
          .setOrigin(0)
          .setScrollFactor(0)
          .setDepth(DEPTH.clouds)
      : null;

    this.mid = scene.add
      .tileSprite(0, VIEW_HEIGHT - MID_LAYER_HEIGHT, VIEW_WIDTH, MID_LAYER_HEIGHT, TEXTURES.mid)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.mid);

    this.darkness = palette.isDark
      ? scene.add.image(0, 0, TEXTURES.spotlight).setScale(SPOTLIGHT_SCALE).setDepth(DEPTH.darkness)
      : null;
  }

  update(camera: Phaser.Cameras.Scene2D.Camera, deltaMs: number, lightX: number, lightY: number): void {
    this.cloudDrift += (CLOUD_DRIFT_PER_SECOND * deltaMs) / 1000;

    this.far.tilePositionX = camera.scrollX * FAR_FACTOR;
    this.mid.tilePositionX = camera.scrollX * MID_FACTOR;

    if (this.clouds) {
      this.clouds.tilePositionX = camera.scrollX * CLOUD_FACTOR + this.cloudDrift;
    }

    this.darkness?.setPosition(lightX, lightY);
  }
}
