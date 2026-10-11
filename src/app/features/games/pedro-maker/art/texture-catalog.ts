import { TILE_SIZE } from '../config/physics.config';
import type { CharacterPalette } from '../config/character.config';
import type { LevelObject, LevelTheme } from '../models/level.model';
import {
  MOVING_PLATFORM_HEIGHT,
  MOVING_PLATFORM_WIDTH,
  paintBrick,
  paintCheckpoint,
  paintCrumble,
  paintDoor,
  paintLava,
  paintMovingPlatform,
  paintPlatformTile,
  paintPortalFrame,
  paintPortalSwirl,
  paintSecretDoor,
  paintSign,
  paintSpring,
  paintSurprise,
  paintTerrainTile,
  PORTAL_HEIGHT,
  PORTAL_SWIRL_SIZE,
  PORTAL_WIDTH,
  TALL_SPRITE_HEIGHT,
  TALL_SPRITE_WIDTH,
} from './block-art';
import { paint } from './canvas';
import {
  BUSH_HEIGHT,
  BUSH_WIDTH,
  FLOWER_SIZE,
  paintBush,
  paintFlower,
  paintRock,
  paintTree,
  ROCK_HEIGHT,
  ROCK_WIDTH,
  TREE_HEIGHT,
  TREE_WIDTH,
} from './decor-art';
import { paintEnemyIcon } from './enemy-art';
import {
  COIN_SIZE,
  CRYSTAL_HEIGHT,
  CRYSTAL_WIDTH,
  HEART_SIZE,
  paintCoinIcon,
  paintCrystal,
  paintHeart,
  paintPowerUp,
  POWER_UP_SIZE,
} from './item-art';
import { THEME_PALETTES, type ThemePalette } from './palettes';
import { PEDRO_FRAME_HEIGHT, PEDRO_FRAME_WIDTH, paintPedroPortrait } from './pedro-art';
import { paintVoxelIcon } from './voxel-tiles';

/* Ícones do editor ------------------------------------------------------------- */

const ICON_SIZE = TILE_SIZE;

/**
 * Ícone de uma peça na grade do editor, pintado em 2D a partir do mesmo
 * catálogo de peças que o jogo monta em 3D.
 *
 * Peças maiores que uma célula (árvore, portal, bandeira) são reduzidas para
 * caber nela — no editor o que importa é reconhecer a peça.
 */
export function paintObjectIcon(object: Pick<LevelObject, 'type' | 'properties'>, theme: LevelTheme): HTMLCanvasElement {
  const palette = THEME_PALETTES[theme];

  return paint(ICON_SIZE, ICON_SIZE, (context) => drawIcon(context, object, theme, palette));
}

/** O Pedro parado, pintado em `scale` vezes o tamanho base para ficar nítido ampliado. */
export function paintPedroIcon(character: CharacterPalette, scale = 1): HTMLCanvasElement {
  return paint(PEDRO_FRAME_WIDTH * scale, PEDRO_FRAME_HEIGHT * scale, (context) => {
    context.scale(scale, scale);
    paintPedroPortrait(context, character);
  });
}

function drawIcon(
  context: CanvasRenderingContext2D,
  object: Pick<LevelObject, 'type' | 'properties'>,
  theme: LevelTheme,
  palette: ThemePalette,
): void {
  const fit = (width: number, height: number, painter: (inner: CanvasRenderingContext2D) => void): void => {
    const scale = Math.min(ICON_SIZE / width, ICON_SIZE / height);

    context.save();
    context.translate((ICON_SIZE - width * scale) / 2, ICON_SIZE - height * scale);
    context.scale(scale, scale);
    painter(context);
    context.restore();
  };

  switch (object.type) {
    case 'ground':
    case 'stone':
    case 'ice':
      paintTerrainTile(context, object.type, palette);
      return;
    case 'sand':
      paintVoxelIcon(context, ICON_SIZE, palette, 'sand');
      return;
    case 'wood':
      paintVoxelIcon(context, ICON_SIZE, palette, 'wood');
      return;
    case 'pipe':
      paintVoxelIcon(context, ICON_SIZE, palette, 'pipe-side', 'pipe-top');
      return;
    case 'cloud':
      paintVoxelIcon(context, ICON_SIZE, palette, 'cloud');
      return;
    case 'platform':
      paintPlatformTile(context, palette);
      return;
    case 'lava':
      paintLava(context);
      return;
    case 'water':
      paintVoxelIcon(context, ICON_SIZE, palette, 'water');
      return;
    case 'brick':
      paintBrick(context);
      return;
    case 'surprise':
      if (object.properties?.contents === 'lucky') {
        paintVoxelIcon(context, ICON_SIZE, palette, 'lucky');
      } else {
        paintSurprise(context);
      }
      return;
    case 'spring':
      paintSpring(context);
      return;
    case 'crumble':
      paintCrumble(context);
      return;
    case 'moving-platform':
      fit(MOVING_PLATFORM_WIDTH, MOVING_PLATFORM_HEIGHT * 2, paintMovingPlatform);
      return;
    case 'slime':
    case 'spiky':
    case 'bat':
    case 'robot':
    case 'ghost':
      paintEnemyIcon(context, object.type);
      return;
    case 'boss':
      paintEnemyIcon(context, 'slime');
      return;
    case 'coin':
      fit(COIN_SIZE, COIN_SIZE, paintCoinIcon);
      return;
    case 'crystal':
      fit(CRYSTAL_WIDTH, CRYSTAL_HEIGHT, paintCrystal);
      return;
    case 'heart':
      fit(HEART_SIZE, HEART_SIZE, paintHeart);
      return;
    case 'power-up':
      fit(POWER_UP_SIZE, POWER_UP_SIZE, (inner) => paintPowerUp(inner, object.properties?.powerUp ?? 'super-jump'));
      return;
    case 'start':
      fit(PEDRO_FRAME_WIDTH, PEDRO_FRAME_HEIGHT, (inner) =>
        paintPedroPortrait(inner, { cap: '#2b7fd9', shirt: '#ff8a3d', backpack: '#4cc26b', backpackStyle: 'dino' }),
      );
      return;
    case 'checkpoint':
      fit(TALL_SPRITE_WIDTH, TALL_SPRITE_HEIGHT, paintCheckpoint);
      return;
    case 'portal':
      fit(PORTAL_WIDTH, PORTAL_HEIGHT, (inner) => {
        inner.drawImage(paint(PORTAL_SWIRL_SIZE, PORTAL_SWIRL_SIZE, paintPortalSwirl), 8, 16);
        paintPortalFrame(inner);
      });
      return;
    case 'door':
      fit(TALL_SPRITE_WIDTH, TALL_SPRITE_HEIGHT, paintDoor);
      return;
    case 'secret-door':
      fit(TALL_SPRITE_WIDTH, TALL_SPRITE_HEIGHT, paintSecretDoor);
      return;
    case 'tree':
      fit(TREE_WIDTH, TREE_HEIGHT, (inner) => paintTree(inner, theme, palette));
      return;
    case 'bush':
      fit(BUSH_WIDTH, BUSH_HEIGHT, (inner) => paintBush(inner, theme, palette));
      return;
    case 'flower':
      fit(FLOWER_SIZE, FLOWER_SIZE, (inner) => paintFlower(inner, palette));
      return;
    case 'rock':
      fit(ROCK_WIDTH, ROCK_HEIGHT, (inner) => paintRock(inner, palette));
      return;
    case 'sign':
      paintSign(context);
      return;
    case 'hint':
    case 'mascot-tip':
      return;
  }
}
