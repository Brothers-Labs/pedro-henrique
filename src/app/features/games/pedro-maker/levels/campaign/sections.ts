import { DEFAULT_LEVEL_HEIGHT } from '../../config/physics.config';
import type { LevelBlueprint, LevelObjectType, LevelTheme, TerrainType } from '../../models/level.model';
import { LevelBuilder } from '../level-builder';

/**
 * Trechos reaproveitados pelas fases desenhadas à mão.
 *
 * Cada trecho já foi medido contra o validador de alcance: uma mola com
 * prateleira sempre alcança a prateleira, uma sala escondida nunca é
 * alcançada por pulo — só pela porta. Montar uma fase nova com eles é juntar
 * peças que já se sabe que funcionam.
 */

/** Linha do chão padrão: o Pedro pisa na linha logo acima dela. */
export const SURFACE = 12;
export const FLOOR = SURFACE - 1;

/** Linha dos blocos que o Pedro alcança com uma cabeçada saindo do chão. */
export const HEADBUTT_ROW = SURFACE - 4;

/**
 * Mola com uma prateleira alta à direita, moedas por cima e, se pedido, um
 * cristal na ponta. Ocupa seis colunas a partir de `x`; precisa de chão embaixo.
 */
export function springShelf(builder: LevelBuilder, x: number, hasCrystal: boolean): LevelBuilder {
  builder.add('spring', x, FLOOR);
  builder.row('platform', x + 1, SURFACE - 7, 5);
  builder.coins(x + 1, SURFACE - 8, 4);

  if (hasCrystal) {
    builder.add('crystal', x + 5, SURFACE - 8);
  }

  return builder;
}

/** Escadaria de pedra de três degraus (sete colunas), com um cristal lá no alto. */
export function stoneStairs(builder: LevelBuilder, x: number, hasCrystal: boolean): LevelBuilder {
  builder.fill('stone', x, x + 6, SURFACE - 1, SURFACE - 1);
  builder.fill('stone', x + 1, x + 5, SURFACE - 2, SURFACE - 2);
  builder.fill('stone', x + 2, x + 4, SURFACE - 3, SURFACE - 3);

  if (hasCrystal) {
    builder.add('crystal', x + 3, SURFACE - 7);
  }

  return builder;
}

/**
 * Buraco de lava: o chão some e a lava fica lá embaixo, à vista.
 *
 * Duas linhas de lava no fundo, e não na superfície, para que o buraco pareça
 * buraco — e para que uma ponte ou plataforma por cima faça sentido.
 */
export function lavaPit(builder: LevelBuilder, fromX: number, toX: number): LevelBuilder {
  builder.clearColumns(fromX, toX);

  return builder.fill('lava', fromX, toX, builder.height - 2, builder.height - 1);
}

export interface HiddenRoomOptions {
  /** Coluna da parede esquerda; a sala ocupa quinze colunas. */
  readonly left: number;
  /** Par da porta que liga a sala ao caminho de baixo. */
  readonly pair: string;
  readonly mascotText: string;
  /** Com porta secreta, a sala libera a fase secreta do mundo. */
  readonly hasSecretDoor: boolean;
}

/**
 * Sala escondida no alto: só se chega pela porta do caminho de baixo.
 *
 * Fica alta demais para qualquer pulo do chão e fechada dos lados. Tem moedas,
 * um cristal e, quando pedido, a porta dourada da fase secreta.
 */
export function hiddenRoom(builder: LevelBuilder, options: HiddenRoomOptions): LevelBuilder {
  const { left, pair } = options;
  const right = left + 14;
  const ceiling = 1;
  const roomFloor = 6;

  builder.fill('stone', left, right, ceiling, ceiling);
  builder.fill('stone', left, right, roomFloor, roomFloor);
  builder.fill('stone', left, left, ceiling, roomFloor);
  builder.fill('stone', right, right, ceiling, roomFloor);

  builder.add('door', left + 2, roomFloor - 1, { pair });
  builder.coins(left + 4, roomFloor - 2, 6);
  builder.add('crystal', left + 8, roomFloor - 3);
  builder.add('mascot-tip', left + 3, roomFloor - 1, { text: options.mascotText });

  if (options.hasSecretDoor) {
    builder.add('sign', left + 11, roomFloor - 1, { text: 'Toque na porta dourada…' });
    builder.add('secret-door', left + 12, roomFloor - 1);
  }

  return builder;
}

/** Porta do caminho de baixo, com a dica de como entrar. */
export function doorWithHint(builder: LevelBuilder, x: number, pair: string): LevelBuilder {
  builder.add('hint', x - 1, SURFACE - 4, { text: 'APERTE E NA PORTA', touchText: 'Toque em AÇÃO na porta' });

  return builder.add('door', x, FLOOR, { pair });
}

/** Espalha um enfeite em várias colunas, sempre em cima do chão padrão. */
export function scatter(builder: LevelBuilder, type: LevelObjectType, columns: readonly number[], row = FLOOR): LevelBuilder {
  for (const x of columns) {
    builder.add(type, x, row);
  }

  return builder;
}

export interface TreasureLevelOptions {
  readonly id: string;
  readonly name: string;
  readonly theme: LevelTheme;
  readonly floor: TerrainType;
  readonly welcome: string;
  readonly mascotText: string;
  readonly farewell: string;
}

/**
 * Fase secreta: um prêmio, e não um teste.
 *
 * Nenhum inimigo, três molas com prateleiras cheias de moedas, um cristal no
 * alto de cada uma e um recado no fim para quem descobriu a porta escondida.
 */
export function buildTreasureLevel(options: TreasureLevelOptions): LevelBlueprint {
  const builder = new LevelBuilder(80, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 79, SURFACE, options.floor);
  builder.add('start', 3, FLOOR);
  builder.add('sign', 5, FLOOR, { text: options.welcome });
  builder.add('mascot-tip', 6, FLOOR, { text: options.mascotText });

  for (const x of [12, 30, 48]) {
    builder.add('spring', x, FLOOR);
    builder.row('platform', x + 1, SURFACE - 7, 5);
    builder.coins(x + 1, SURFACE - 8, 5);
    builder.coinArc(x + 6, SURFACE - 3, 5);
    builder.add('crystal', x + 6, SURFACE - 9);
  }

  builder.coins(60, FLOOR, 10);
  builder.add('sign', 70, FLOOR, { text: options.farewell });
  builder.add('portal', 74, FLOOR);
  scatter(builder, 'flower', [1, 9, 25, 43, 58, 77]);

  return builder.build({
    id: options.id,
    name: options.name,
    theme: options.theme,
    targetTimeSeconds: 60,
  });
}
