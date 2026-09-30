import { TILE_SIZE } from '../config/physics.config';
import type { CharacterPalette } from '../config/character.config';
import type {
  BossDefinition,
  EnemyKind,
  LevelObject,
  LevelTheme,
  PowerUpKind,
} from '../models/level.model';
import {
  paintCloudLayer,
  paintFarLayer,
  paintMidLayer,
  paintSky,
  paintSpotlight,
} from './background-art';
import {
  MOVING_PLATFORM_HEIGHT,
  MOVING_PLATFORM_WIDTH,
  paintBrick,
  paintCheckpoint,
  paintCheckpointStrip,
  paintCrumble,
  paintDoor,
  paintLava,
  paintLavaStrip,
  paintMovingPlatform,
  paintPlatformTile,
  paintPortalFrame,
  paintPortalSwirl,
  paintSecretDoor,
  paintSign,
  paintSpring,
  paintSpringStrip,
  paintSurprise,
  paintSurpriseStrip,
  paintTerrainTile,
  paintTileset,
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
import { BOSS_FRAME_HEIGHT, BOSS_FRAME_WIDTH, paintBossStrip } from './boss-art';
import { ENEMY_FRAME, paintEnemyIcon, paintEnemyStrip } from './enemy-art';
import {
  CHEST_HEIGHT,
  CHEST_WIDTH,
  COIN_SIZE,
  CRYSTAL_HEIGHT,
  CRYSTAL_WIDTH,
  HEART_SIZE,
  paintChestStrip,
  paintCoinIcon,
  paintCoinStrip,
  paintCrystal,
  paintHeart,
  paintParticleDot,
  paintParticleSpark,
  paintParticleStar,
  paintPowerUp,
  POWER_UP_SIZE,
} from './item-art';
import { THEME_PALETTES, type ThemePalette } from './palettes';
import { PEDRO_FRAME_HEIGHT, PEDRO_FRAME_WIDTH, paintPedroPortrait, paintPedroStrip } from './pedro-art';

/** Nomes das texturas no motor. Um lugar só, para nenhum texto se repetir solto. */
export const TEXTURES = {
  pedro: 'pedro',
  tiles: 'tiles',
  coin: 'coin',
  crystal: 'crystal',
  heart: 'heart',
  boss: 'boss',
  chest: 'chest',
  brick: 'brick',
  surprise: 'surprise',
  spring: 'spring',
  crumble: 'crumble',
  movingPlatform: 'moving-platform',
  lava: 'lava',
  checkpoint: 'checkpoint',
  door: 'door',
  secretDoor: 'secret-door',
  portalFrame: 'portal-frame',
  portalSwirl: 'portal-swirl',
  sign: 'sign',
  tree: 'tree',
  bush: 'bush',
  flower: 'flower',
  rock: 'rock',
  sky: 'sky',
  far: 'far',
  mid: 'mid',
  clouds: 'clouds',
  spotlight: 'spotlight',
  dot: 'particle-dot',
  star: 'particle-star',
  spark: 'particle-spark',
} as const;

export function powerUpTexture(kind: PowerUpKind): string {
  return `power-${kind}`;
}

export function enemyTexture(kind: EnemyKind): string {
  return `enemy-${kind}`;
}

/** Uma textura a gerar: quadros opcionais para as tiras de animação. */
export interface TextureSpec {
  readonly key: string;
  readonly frameWidth?: number;
  readonly frameHeight?: number;
  readonly create: () => HTMLCanvasElement;
}

export interface TextureRequest {
  readonly theme: LevelTheme;
  readonly character: CharacterPalette;
  readonly boss?: BossDefinition;
}

const ENEMIES: readonly EnemyKind[] = ['slime', 'spiky', 'bat', 'robot', 'ghost'];
const POWER_UPS: readonly PowerUpKind[] = ['super-jump', 'shield', 'turbo', 'magnet', 'wings'];

/** Tudo o que uma fase precisa desenhar, na ordem em que vale gerar. */
export function textureSpecsFor(request: TextureRequest): readonly TextureSpec[] {
  const palette = THEME_PALETTES[request.theme];
  const theme = request.theme;
  const boss = request.boss;

  return [
    { key: TEXTURES.sky, create: () => paintSky(palette) },
    { key: TEXTURES.far, create: () => paintFarLayer(palette) },
    { key: TEXTURES.mid, create: () => paintMidLayer(palette) },
    { key: TEXTURES.clouds, create: paintCloudLayer },
    { key: TEXTURES.spotlight, create: paintSpotlight },
    { key: TEXTURES.tiles, create: () => paintTileset(palette) },
    {
      key: TEXTURES.pedro,
      frameWidth: PEDRO_FRAME_WIDTH,
      frameHeight: PEDRO_FRAME_HEIGHT,
      create: () => paintPedroStrip(request.character),
    },
    ...ENEMIES.map((kind) => ({
      key: enemyTexture(kind),
      frameWidth: ENEMY_FRAME,
      frameHeight: ENEMY_FRAME,
      create: () => paintEnemyStrip(kind),
    })),
    ...(boss
      ? [
          {
            key: TEXTURES.boss,
            frameWidth: BOSS_FRAME_WIDTH,
            frameHeight: BOSS_FRAME_HEIGHT,
            create: () => paintBossStrip(boss),
          },
          { key: TEXTURES.chest, frameWidth: CHEST_WIDTH, frameHeight: CHEST_HEIGHT, create: paintChestStrip },
        ]
      : []),
    { key: TEXTURES.coin, frameWidth: COIN_SIZE, frameHeight: COIN_SIZE, create: paintCoinStrip },
    { key: TEXTURES.crystal, create: () => paint(CRYSTAL_WIDTH, CRYSTAL_HEIGHT, paintCrystal) },
    { key: TEXTURES.heart, create: () => paint(HEART_SIZE, HEART_SIZE, paintHeart) },
    ...POWER_UPS.map((kind) => ({
      key: powerUpTexture(kind),
      create: () => paint(POWER_UP_SIZE, POWER_UP_SIZE, (context) => paintPowerUp(context, kind)),
    })),
    { key: TEXTURES.brick, create: () => paint(TILE_SIZE, TILE_SIZE, paintBrick) },
    { key: TEXTURES.surprise, frameWidth: TILE_SIZE, frameHeight: TILE_SIZE, create: paintSurpriseStrip },
    { key: TEXTURES.spring, frameWidth: TILE_SIZE, frameHeight: TILE_SIZE, create: paintSpringStrip },
    { key: TEXTURES.crumble, create: () => paint(TILE_SIZE, TILE_SIZE / 2, paintCrumble) },
    {
      key: TEXTURES.movingPlatform,
      create: () => paint(MOVING_PLATFORM_WIDTH, MOVING_PLATFORM_HEIGHT, paintMovingPlatform),
    },
    { key: TEXTURES.lava, frameWidth: TILE_SIZE, frameHeight: TILE_SIZE, create: paintLavaStrip },
    {
      key: TEXTURES.checkpoint,
      frameWidth: TALL_SPRITE_WIDTH,
      frameHeight: TALL_SPRITE_HEIGHT,
      create: paintCheckpointStrip,
    },
    { key: TEXTURES.door, create: () => paint(TALL_SPRITE_WIDTH, TALL_SPRITE_HEIGHT, paintDoor) },
    { key: TEXTURES.secretDoor, create: () => paint(TALL_SPRITE_WIDTH, TALL_SPRITE_HEIGHT, paintSecretDoor) },
    { key: TEXTURES.portalFrame, create: () => paint(PORTAL_WIDTH, PORTAL_HEIGHT, paintPortalFrame) },
    { key: TEXTURES.portalSwirl, create: () => paint(PORTAL_SWIRL_SIZE, PORTAL_SWIRL_SIZE, paintPortalSwirl) },
    { key: TEXTURES.sign, create: () => paint(TILE_SIZE, TILE_SIZE, paintSign) },
    { key: TEXTURES.tree, create: () => paint(TREE_WIDTH, TREE_HEIGHT, (context) => paintTree(context, theme, palette)) },
    { key: TEXTURES.bush, create: () => paint(BUSH_WIDTH, BUSH_HEIGHT, (context) => paintBush(context, theme, palette)) },
    { key: TEXTURES.flower, create: () => paint(FLOWER_SIZE, FLOWER_SIZE, (context) => paintFlower(context, palette)) },
    { key: TEXTURES.rock, create: () => paint(ROCK_WIDTH, ROCK_HEIGHT, (context) => paintRock(context, palette)) },
    { key: TEXTURES.dot, create: paintParticleDot },
    { key: TEXTURES.star, create: paintParticleStar },
    { key: TEXTURES.spark, create: paintParticleSpark },
  ];
}

/* Ícones do editor ------------------------------------------------------------- */

const ICON_SIZE = TILE_SIZE;

/**
 * Ícone de uma peça na grade do editor, com o mesmo desenho do jogo.
 *
 * Peças maiores que uma célula (árvore, portal, bandeira) são reduzidas para
 * caber nela — no editor o que importa é reconhecer a peça.
 */
export function paintObjectIcon(object: Pick<LevelObject, 'type' | 'properties'>, theme: LevelTheme): HTMLCanvasElement {
  const palette = THEME_PALETTES[theme];

  return paint(ICON_SIZE, ICON_SIZE, (context) => drawIcon(context, object, theme, palette));
}

/** O Pedro parado, pintado em `scale` vezes o tamanho do jogo para ficar nítido ampliado. */
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
      paintTerrainTile(context, object.type, 3, palette);
      return;
    case 'platform':
      paintPlatformTile(context, palette);
      return;
    case 'lava':
      paintLava(context);
      return;
    case 'brick':
      paintBrick(context);
      return;
    case 'surprise':
      paintSurprise(context);
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
      fit(TALL_SPRITE_WIDTH, TALL_SPRITE_HEIGHT, (inner) => paintCheckpoint(inner, true));
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
