import { TILE_SIZE } from '../config/physics.config';
import { DEFAULT_LOOK, paletteFor, type CharacterPalette } from '../config/character.config';
import {
  formatCoinValue,
  giantCoinValue,
  isGiantCoinType,
  type LevelObject,
  type LevelTheme,
  type PowerUpKind,
  type SurpriseContent,
} from '../models/level.model';
import {
  MOVING_PLATFORM_HEIGHT,
  MOVING_PLATFORM_WIDTH,
  paintCannon,
  paintBrick,
  paintCheckpoint,
  paintGoalFlag,
  paintCrumble,
  paintDoor,
  paintCoinChest,
  paintGoldenDoor,
  paintLava,
  paintCeilingSpring,
  paintMovingPlatform,
  paintPlatformTile,
  paintCastleFrame,
  paintInvisibleGrass,
  paintPortalFrame,
  paintPortalSwirl,
  paintMultiCoinBlock,
  paintSlide,
  paintSecretDoor,
  paintSign,
  paintSkeletonPlatform,
  paintSpikes,
  paintSpring,
  paintSurprise,
  paintSurpriseBadge,
  paintTerrainTile,
  PORTAL_HEIGHT,
  PORTAL_SWIRL_SIZE,
  PORTAL_WIDTH,
  COIN_CHEST_SIZE,
  TALL_SPRITE_HEIGHT,
  TALL_SPRITE_WIDTH,
} from './block-art';
import { paint } from './canvas';
import {
  ARROW_HEIGHT,
  ARROW_WIDTH,
  BALLOONS_HEIGHT,
  BALLOONS_WIDTH,
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
  paintBalloons,
  paintBarrel,
  paintBush,
  paintCrate,
  paintFence,
  paintFlower,
  paintGrass,
  paintLamp,
  paintRock,
  paintSnowman,
  paintPumpkinDecor,
  paintToadstool,
  paintTree,
  PUMPKIN_HEIGHT,
  PUMPKIN_WIDTH,
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
  HUGE_COIN_SIZE,
  CRYSTAL_HEIGHT,
  CRYSTAL_WIDTH,
  HEART_SIZE,
  paintNumberedCoin,
  paintBigCoin,
  paintCoinIcon,
  paintHugeCoin,
  paintCrystal,
  paintHeart,
  paintPowerUp,
  POWER_UP_SIZE,
} from './item-art';
import {
  ANA_PORTRAIT,
  BRUNO_PORTRAIT,
  CAIO_PORTRAIT,
  DUDA_PORTRAIT,
  GIUSEPPE_PORTRAIT,
  GUI_PORTRAIT,
  LUIGI_PORTRAIT,
  MARIO_PORTRAIT,
  NINA_PORTRAIT,
  OTTO_PORTRAIT,
  paintOverallsPortrait,
  RAFA_PORTRAIT,
  TINA_PORTRAIT,
  VAVA_PORTRAIT,
  ZECA_PORTRAIT,
} from './overalls-art';
import { CORAL_PORTRAIT, DAISY_PORTRAIT, ESTRELA_PORTRAIT, JADE_PORTRAIT, paintPrincessPortrait, PEACH_PORTRAIT } from './princess-art';
import { paintWarioPortrait } from './wario-art';
import { THEME_PALETTES, type ThemePalette } from './palettes';
import { PEDRO_FRAME_HEIGHT, PEDRO_FRAME_WIDTH, paintPedroPortrait } from './pedro-art';
import { paintVoxelIcon } from './voxel-tiles';
import {
  LOCK_ART_SIZE,
  LOCKED_DOOR_HEIGHT,
  LOCKED_DOOR_WIDTH,
  paintChain,
  paintClimbChain,
  paintCrusher,
  paintKey,
  paintLever,
  paintLockedDoor,
} from './lock-art';
import { PATH_ART_SIZE, paintFireBar, paintPSwitch, paintTalkingFlower, paintWarpPipe } from './path-art';

/* Ícones do editor ------------------------------------------------------------- */

const ICON_SIZE = TILE_SIZE;

/**
 * Ícones do editor são pintados com três vezes os pixels da célula: na grade
 * ampliada e em telas 4K ficam nítidos, sem borrar ao esticar.
 */
export const SHARP_ICON_SCALE = 3;

/**
 * Ícone de uma peça na grade do editor, pintado em 2D a partir do mesmo
 * catálogo de peças que o jogo monta em 3D.
 *
 * Peças maiores que uma célula (árvore, portal, bandeira) são reduzidas para
 * caber nela — no editor o que importa é reconhecer a peça.
 */
export function paintObjectIcon(object: Pick<LevelObject, 'type' | 'properties'>, theme: LevelTheme, scale = 1): HTMLCanvasElement {
  const palette = THEME_PALETTES[theme];

  return paint(ICON_SIZE * scale, ICON_SIZE * scale, (context) => {
    context.scale(scale, scale);
    drawIcon(context, object, theme, palette);
  });
}

/** O herói parado, pintado em `scale` vezes o tamanho base para ficar nítido ampliado. */
export function paintCharacterIcon(character: CharacterPalette, scale = 1): HTMLCanvasElement {
  return paint(PEDRO_FRAME_WIDTH * scale, PEDRO_FRAME_HEIGHT * scale, (context) => {
    context.scale(scale, scale);
    paintCharacterPortrait(context, character);
  });
}

/** Todos os heróis dividem o mesmo quadro de retrato; o Pedro e o Wario têm pintor próprio, e os de macacão, um só. */
function paintCharacterPortrait(context: CanvasRenderingContext2D, character: CharacterPalette): void {
  switch (character.hero) {
    case 'pedro':
    case 'pedrere':
      paintPedroPortrait(context, character);
      return;
    case 'wario':
      paintWarioPortrait(context, character);
      return;
    case 'gui':
      paintOverallsPortrait(context, character, GUI_PORTRAIT);
      return;
    case 'mario':
      paintOverallsPortrait(context, character, MARIO_PORTRAIT);
      return;
    case 'luigi':
      paintOverallsPortrait(context, character, LUIGI_PORTRAIT);
      return;
    case 'giuseppe':
      paintOverallsPortrait(context, character, GIUSEPPE_PORTRAIT);
      return;
    case 'zeca':
      paintOverallsPortrait(context, character, ZECA_PORTRAIT);
      return;
    case 'tina':
      paintOverallsPortrait(context, character, TINA_PORTRAIT);
      return;
    case 'bruno':
      paintOverallsPortrait(context, character, BRUNO_PORTRAIT);
      return;
    case 'ana':
      paintOverallsPortrait(context, character, ANA_PORTRAIT);
      return;
    case 'caio':
      paintOverallsPortrait(context, character, CAIO_PORTRAIT);
      return;
    case 'nina':
      paintOverallsPortrait(context, character, NINA_PORTRAIT);
      return;
    case 'otto':
      paintOverallsPortrait(context, character, OTTO_PORTRAIT);
      return;
    case 'vava':
      paintOverallsPortrait(context, character, VAVA_PORTRAIT);
      return;
    case 'rafa':
      paintOverallsPortrait(context, character, RAFA_PORTRAIT);
      return;
    case 'duda':
      paintOverallsPortrait(context, character, DUDA_PORTRAIT);
      return;
    case 'estrela':
      paintPrincessPortrait(context, character, ESTRELA_PORTRAIT);
      return;
    case 'jade':
      paintPrincessPortrait(context, character, JADE_PORTRAIT);
      return;
    case 'coral':
      paintPrincessPortrait(context, character, CORAL_PORTRAIT);
      return;
    case 'peach':
      paintPrincessPortrait(context, character, PEACH_PORTRAIT);
      return;
    case 'daisy':
      paintPrincessPortrait(context, character, DAISY_PORTRAIT);
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

  if (isGiantCoinType(object.type)) {
    const label = formatCoinValue(giantCoinValue(object.type));

    fit(HUGE_COIN_SIZE, HUGE_COIN_SIZE, (inner) => paintNumberedCoin(inner, HUGE_COIN_SIZE, label));
    return;
  }

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
    case 'desert-mountain':
      paintVoxelIcon(context, ICON_SIZE, palette, 'mesa-side', 'mesa-top');
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
    case 'invisible-grass':
      paintInvisibleGrass(context, palette);
      return;
    case 'cannon':
      paintCannon(context);
      return;
    case 'fire-bar':
      fit(PATH_ART_SIZE, PATH_ART_SIZE, paintFireBar);
      return;
    case 'warp-pipe':
      fit(PATH_ART_SIZE, PATH_ART_SIZE, paintWarpPipe);
      return;
    case 'p-switch':
      fit(PATH_ART_SIZE, PATH_ART_SIZE, paintPSwitch);
      return;
    case 'key':
      fit(LOCK_ART_SIZE, LOCK_ART_SIZE, paintKey);
      return;
    case 'locked-door':
      fit(LOCKED_DOOR_WIDTH, LOCKED_DOOR_HEIGHT, paintLockedDoor);
      return;
    case 'chain':
      fit(LOCK_ART_SIZE, LOCK_ART_SIZE, paintChain);
      return;
    case 'lever':
      fit(LOCK_ART_SIZE, LOCK_ART_SIZE, paintLever);
      return;
    case 'crusher':
      fit(LOCK_ART_SIZE, LOCK_ART_SIZE, paintCrusher);
      return;
    case 'climb-chain':
      fit(LOCK_ART_SIZE, LOCK_ART_SIZE, paintClimbChain);
      return;
    case 'talking-flower':
      fit(PATH_ART_SIZE, PATH_ART_SIZE, paintTalkingFlower);
      return;
    case 'brick':
      paintBrick(context);
      return;
    case 'note':
      paintVoxelIcon(context, ICON_SIZE, palette, 'note');
      return;
    case 'on-off-switch':
      paintVoxelIcon(context, ICON_SIZE, palette, 'switch-on');
      return;
    case 'red-block':
    case 'blue-block':
      paintVoxelIcon(context, ICON_SIZE, palette, object.type);
      return;
    case 'surprise':
      paintSurpriseIcon(context, object.properties?.contents, object.properties?.powerUp, palette);
      return;
    case 'spring':
      paintSpring(context);
      return;
    case 'ceiling-spring':
      paintCeilingSpring(context);
      return;
    case 'slide':
      paintSlide(context);
      return;
    case 'crumble':
      paintCrumble(context);
      return;
    case 'moving-platform':
      fit(MOVING_PLATFORM_WIDTH, MOVING_PLATFORM_HEIGHT * 2, paintMovingPlatform);
      return;
    case 'skeleton-platform':
      fit(MOVING_PLATFORM_WIDTH, MOVING_PLATFORM_HEIGHT * 2, paintSkeletonPlatform);
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
    case 'goomba':
    case 'bullet':
    case 'thwomp':
    case 'king-slime':
    case 'iron-ball':
    case 'fish':
    case 'jumping-fish':
    case 'king-cactus':
    case 'living-pumpkin':
    case 'witch':
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
    case 'huge-coin':
      fit(HUGE_COIN_SIZE, HUGE_COIN_SIZE, paintHugeCoin);
      return;
    case 'mega-coin':
      fit(HUGE_COIN_SIZE, HUGE_COIN_SIZE, (inner) => paintNumberedCoin(inner, HUGE_COIN_SIZE, '★'));
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
      if (object.properties?.portalLook === 'flag') {
        fit(TALL_SPRITE_WIDTH, TALL_SPRITE_HEIGHT, paintGoalFlag);
        return;
      }

      fit(PORTAL_WIDTH, PORTAL_HEIGHT, (inner) => {
        if (object.properties?.portalLook === 'castle') {
          // O portão do castelo é menor que o arco: o redemoinho entra encolhido.
          paintCastleFrame(inner);
          inner.drawImage(paint(PORTAL_SWIRL_SIZE, PORTAL_SWIRL_SIZE, paintPortalSwirl), 34, 56, 44, 44);
          return;
        }

        inner.drawImage(paint(PORTAL_SWIRL_SIZE, PORTAL_SWIRL_SIZE, paintPortalSwirl), 8, 16);
        paintPortalFrame(inner);
      });
      return;
    case 'door':
      fit(TALL_SPRITE_WIDTH, TALL_SPRITE_HEIGHT, paintDoor);
      return;
    case 'golden-door':
      fit(TALL_SPRITE_WIDTH, TALL_SPRITE_HEIGHT, paintGoldenDoor);
      return;
    case 'secret-door':
      fit(TALL_SPRITE_WIDTH, TALL_SPRITE_HEIGHT, paintSecretDoor);
      return;
    case 'coin-chest':
      fit(COIN_CHEST_SIZE, COIN_CHEST_SIZE, paintCoinChest);
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
    case 'pumpkin':
      fit(PUMPKIN_WIDTH, PUMPKIN_HEIGHT, paintPumpkinDecor);
      return;
    case 'crate':
      fit(CRATE_SIZE, CRATE_SIZE, paintCrate);
      return;
    case 'balloons':
      fit(BALLOONS_WIDTH, BALLOONS_HEIGHT, paintBalloons);
      return;
    case 'sign':
      paintSign(context, object.properties?.text ?? '');
      return;
    case 'hint':
    case 'mascot-tip':
      return;
  }
}

/**
 * O Lucky Block e o bloco de moedas têm cara própria; os outros, a do "?",
 * com um selo no canto que conta o que sai dele (sem conteúdo, são moedas).
 */
function paintSurpriseIcon(
  context: CanvasRenderingContext2D,
  contents: SurpriseContent | undefined,
  powerUp: PowerUpKind | undefined,
  palette: ThemePalette,
): void {
  switch (contents) {
    case 'lucky':
      paintVoxelIcon(context, ICON_SIZE, palette, 'lucky');
      return;
    case 'multi-coins':
      paintMultiCoinBlock(context);
      return;
    default:
      paintSurprise(context);
      paintSurpriseBadge(context, contents ?? 'coins', powerUp === 'mushroom');
  }
}
