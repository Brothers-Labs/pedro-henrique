import { TILE_SIZE } from '../config/physics.config';
import { DEFAULT_LOOK, paletteFor, type CharacterPalette } from '../config/character.config';
import type { LevelObject, LevelTheme, SurpriseContent } from '../models/level.model';
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
  paintMultiCoinBlock,
  paintSecretDoor,
  paintSign,
  paintSpikes,
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
  ARROW_HEIGHT,
  ARROW_WIDTH,
  BARREL_HEIGHT,
  BARREL_WIDTH,
  BUSH_HEIGHT,
  BUSH_WIDTH,
  CRATE_SIZE,
  FENCE_HEIGHT,
  FENCE_WIDTH,
  FLOWER_SIZE,
  GRASS_HEIGHT,
  GRASS_WIDTH,
  LAMP_HEIGHT,
  LAMP_WIDTH,
  paintArrowSign,
  paintBarrel,
  paintBush,
  paintCrate,
  paintFence,
  paintFlower,
  paintGrass,
  paintLamp,
  paintRock,
  paintSnowman,
  paintToadstool,
  paintTree,
  ROCK_HEIGHT,
  ROCK_WIDTH,
  SNOWMAN_HEIGHT,
  SNOWMAN_WIDTH,
  TOADSTOOL_SIZE,
  TREE_HEIGHT,
  TREE_WIDTH,
} from './decor-art';
import { paintEnemyIcon } from './enemy-art';
import {
  BIG_COIN_SIZE,
  COIN_SIZE,
  CRYSTAL_HEIGHT,
  CRYSTAL_WIDTH,
  HEART_SIZE,
  paintBigCoin,
  paintCoinIcon,
  paintCrystal,
  paintHeart,
  paintPowerUp,
  POWER_UP_SIZE,
} from './item-art';
import { THEME_PALETTES, type ThemePalette } from './palettes';
import { paintGuiPortrait } from './gui-art';
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

/** O herói parado, pintado em `scale` vezes o tamanho base para ficar nítido ampliado. */
export function paintCharacterIcon(character: CharacterPalette, scale = 1): HTMLCanvasElement {
  return paint(PEDRO_FRAME_WIDTH * scale, PEDRO_FRAME_HEIGHT * scale, (context) => {
    context.scale(scale, scale);
    paintCharacterPortrait(context, character);
  });
}

/** Pedro e Gui dividem o mesmo quadro de retrato; cada um tem o próprio pintor. */
function paintCharacterPortrait(context: CanvasRenderingContext2D, character: CharacterPalette): void {
  switch (character.hero) {
    case 'pedro':
      paintPedroPortrait(context, character);
      return;
    case 'gui':
      paintGuiPortrait(context, character);
      return;
  }
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
    case 'spikes':
      paintSpikes(context);
      return;
    case 'brick':
      paintBrick(context);
      return;
    case 'note':
      paintVoxelIcon(context, ICON_SIZE, palette, 'note');
      return;
    case 'surprise':
      paintSurpriseIcon(context, object.properties?.contents, palette);
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
    case 'turtle':
    case 'piranha':
    case 'penguin':
    case 'lava-bubble':
    case 'bee':
      paintEnemyIcon(context, object.type);
      return;
    case 'boss':
      paintEnemyIcon(context, 'slime');
      return;
    case 'coin':
      fit(COIN_SIZE, COIN_SIZE, paintCoinIcon);
      return;
    case 'big-coin':
      fit(BIG_COIN_SIZE, BIG_COIN_SIZE, paintBigCoin);
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
      fit(PEDRO_FRAME_WIDTH, PEDRO_FRAME_HEIGHT, (inner) => paintPedroPortrait(inner, paletteFor(DEFAULT_LOOK, 'pedro')));
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
    case 'fence':
      fit(FENCE_WIDTH, FENCE_HEIGHT, paintFence);
      return;
    case 'snowman':
      fit(SNOWMAN_WIDTH, SNOWMAN_HEIGHT, paintSnowman);
      return;
    case 'toadstool':
      fit(TOADSTOOL_SIZE, TOADSTOOL_SIZE, paintToadstool);
      return;
    case 'barrel':
      fit(BARREL_WIDTH, BARREL_HEIGHT, paintBarrel);
      return;
    case 'lamp':
      fit(LAMP_WIDTH, LAMP_HEIGHT, paintLamp);
      return;
    case 'grass':
      fit(GRASS_WIDTH, GRASS_HEIGHT, (inner) => paintGrass(inner, palette));
      return;
    case 'arrow':
      fit(ARROW_WIDTH, ARROW_HEIGHT, paintArrowSign);
      return;
    case 'crate':
      fit(CRATE_SIZE, CRATE_SIZE, paintCrate);
      return;
    case 'sign':
      paintSign(context);
      return;
    case 'hint':
    case 'mascot-tip':
      return;
  }
}

/** O Lucky Block e o bloco de moedas têm cara própria; os outros, a do "?". */
function paintSurpriseIcon(context: CanvasRenderingContext2D, contents: SurpriseContent | undefined, palette: ThemePalette): void {
  switch (contents) {
    case 'lucky':
      paintVoxelIcon(context, ICON_SIZE, palette, 'lucky');
      return;
    case 'multi-coins':
      paintMultiCoinBlock(context);
      return;
    default:
      paintSurprise(context);
  }
}
