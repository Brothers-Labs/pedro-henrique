import { DEFAULT_LEVEL_HEIGHT } from '../../config/physics.config';
import type { LevelBlueprint } from '../../models/level.model';
import { LevelBuilder } from '../level-builder';
import {
  buildTreasureLevel,
  doorWithHint,
  FLOOR,
  HEADBUTT_ROW,
  hiddenRoom,
  lavaPit,
  scatter,
  springShelf,
  stoneStairs,
  SURFACE,
} from './sections';

/**
 * Mundo 6 — Dia das Bruxas.
 *
 * Noite roxa, árvores secas e abóboras por todo lado. A abóbora viva ensina a
 * pisar em quem pula, a bruxa cruza o céu de vassoura e o Rei Cacto, que não
 * se pisa, guarda a torre. A ponte de esqueletos atravessa a lava.
 */

const THEME = 'dia-das-bruxas';
/** Altura em que a bruxa voa: acima da cabeça do herói, ao alcance de um pulo. */
const WITCH_ROW = SURFACE - 4;

/** 6-1 — Abóboras Saltitantes: as abóboras vivas, os blocos musicais e a primeira bruxa. */
export function buildAboborasSaltitantes(): LevelBlueprint {
  const builder = new LevelBuilder(140, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 24, SURFACE);
  builder.add('start', 3, FLOOR);
  builder.add('mascot-tip', 4, FLOOR, { text: 'Feliz Dia das Bruxas! As abóboras estão pulando!' });
  builder.coins(7, FLOOR, 4);
  builder.add('hint', 12, SURFACE - 5, { text: 'PISE NA ABÓBORA VIVA!' });
  builder.add('living-pumpkin', 16, FLOOR);

  builder.coinArc(24, SURFACE - 3, 5);
  builder.ground(28, 60, SURFACE);
  builder.add('surprise', 32, HEADBUTT_ROW, { contents: 'coins' });
  builder.add('brick', 33, HEADBUTT_ROW);
  builder.add('surprise', 34, HEADBUTT_ROW, { contents: 'crystal' });
  builder.add('brick', 35, HEADBUTT_ROW);
  builder.add('living-pumpkin', 40, FLOOR);
  builder.row('note', 46, FLOOR, 3);
  builder.coins(46, SURFACE - 6, 3);
  builder.add('checkpoint', 54, FLOOR);

  builder.coinArc(60, SURFACE - 3, 5);
  builder.ground(64, 100, SURFACE);
  builder.add('witch', 72, WITCH_ROW);
  stoneStairs(builder, 78, true);
  builder.add('living-pumpkin', 90, FLOOR);
  builder.add('surprise', 94, HEADBUTT_ROW, { contents: 'power-up', powerUp: 'super-jump' });

  builder.coinArc(100, SURFACE - 3, 5);
  builder.ground(104, 139, SURFACE);
  springShelf(builder, 110, true);
  builder.add('living-pumpkin', 120, FLOOR);
  builder.add('sign', 126, FLOOR, { text: 'Gostosuras ou travessuras! 🎃' });
  builder.add('portal', 132, FLOOR);

  scatter(builder, 'tree', [1, 13, 30, 58, 67, 98, 107, 137]);
  scatter(builder, 'pumpkin', [6, 26, 52, 70, 96, 124]);

  return builder.build({ id: '6-1', name: 'Abóboras Saltitantes', theme: THEME, targetTimeSeconds: 90 });
}

/** 6-2 — Floresta Assombrada: bruxas no céu, plataformas móveis e o esconderijo da bruxa (entrada da 6-S). */
export function buildFlorestaAssombrada(): LevelBlueprint {
  const builder = new LevelBuilder(150, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 18, SURFACE);
  builder.add('start', 3, FLOOR);
  builder.add('mascot-tip', 4, FLOOR, { text: 'Psiu… dizem que a bruxa esconde uma sala nesta floresta.' });
  builder.add('witch', 12, WITCH_ROW);

  builder.add('moving-platform', 20, SURFACE, { axis: 'horizontal', range: 4 });
  builder.coins(21, SURFACE - 3, 4);
  builder.ground(27, 48, SURFACE);
  builder.add('living-pumpkin', 32, FLOOR);
  builder.add('surprise', 36, HEADBUTT_ROW, { contents: 'crystal' });
  builder.add('witch', 40, WITCH_ROW);
  doorWithHint(builder, 43, 'caldeirao');

  builder.add('moving-platform', 46, FLOOR, { axis: 'vertical', range: 4 });
  builder.ground(49, 60, SURFACE - 5);
  builder.coins(50, SURFACE - 7, 4);
  builder.add('living-pumpkin', 56, SURFACE - 6);

  builder.ground(61, 80, SURFACE);
  builder.add('checkpoint', 64, FLOOR);
  springShelf(builder, 70, true);

  builder.add('moving-platform', 82, SURFACE, { axis: 'horizontal', range: 4 });
  builder.ground(89, 149, SURFACE);
  hiddenRoom(builder, {
    left: 100,
    pair: 'caldeirao',
    mascotText: 'O caldeirão da bruxa! E cheio de doces!',
    hasSecretDoor: true,
  });

  builder.add('living-pumpkin', 118, FLOOR);
  builder.add('witch', 124, WITCH_ROW);
  builder.add('living-pumpkin', 130, FLOOR);
  builder.coins(134, SURFACE - 3, 4);
  builder.add('portal', 142, FLOOR);

  scatter(builder, 'tree', [1, 13, 29, 66, 92, 116, 146]);
  scatter(builder, 'pumpkin', [8, 45, 76, 96, 136]);

  return builder.build({ id: '6-2', name: 'Floresta Assombrada', theme: THEME, targetTimeSeconds: 110 });
}

/** 6-3 — Torre da Bruxa: a escalada da torre, a ponte de esqueletos sobre a lava e o Rei Cacto. */
export function buildTorreDaBruxa(): LevelBlueprint {
  const builder = new LevelBuilder(150, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 75, SURFACE);
  builder.add('start', 3, FLOOR);
  builder.add('mascot-tip', 4, FLOOR, { text: 'A torre da bruxa! O Rei Cacto tem espinhos: pule por cima dele!' });
  builder.coins(10, SURFACE - 3, 4);
  builder.add('living-pumpkin', 20, FLOOR);

  // A torre: cinco degraus de uma célula de altura, dois de largura de cada lado.
  for (let step = 0; step < 5; step += 1) {
    builder.fill('stone', 30 + step * 2, 70 - step * 2, SURFACE - 1 - step, SURFACE - 1 - step);
    builder.coins(31 + step * 2, SURFACE - 3 - step, 1);
    builder.coins(69 - step * 2, SURFACE - 3 - step, 1);
  }

  builder.add('witch', 50, SURFACE - 9);
  builder.add('crystal', 48, 3);
  builder.add('sign', 44, SURFACE - 6, { text: 'Topo da torre! 🧙' });

  // A ponte de esqueletos espera na beira da lava e leva o herói até a parede do outro lado.
  builder.add('hint', 72, SURFACE - 5, { text: 'SUBA NA PONTE DE ESQUELETOS!' });
  lavaPit(builder, 76, 91);
  builder.add('skeleton-platform', 76, SURFACE);
  builder.coins(80, SURFACE - 3, 5);

  builder.ground(92, 149, SURFACE);
  builder.add('checkpoint', 95, FLOOR);
  builder.add('brick', 100, HEADBUTT_ROW);
  builder.add('surprise', 101, HEADBUTT_ROW, { contents: 'power-up', powerUp: 'fire-flower' });
  builder.add('brick', 102, HEADBUTT_ROW);
  builder.add('surprise', 103, HEADBUTT_ROW, { contents: 'crystal' });
  builder.row('brick', 104, HEADBUTT_ROW, 3);
  builder.add('king-cactus', 112, FLOOR);
  stoneStairs(builder, 120, true);
  builder.add('living-pumpkin', 131, FLOOR);
  builder.coins(134, SURFACE - 3, 5);
  builder.add('portal', 142, FLOOR);

  scatter(builder, 'tree', [1, 15, 25, 98, 137]);
  scatter(builder, 'pumpkin', [7, 27, 73, 116, 146]);

  return builder.build({ id: '6-3', name: 'Torre da Bruxa', theme: THEME, targetTimeSeconds: 110 });
}

/** 6-S — Sala dos Doces, a fase secreta do Dia das Bruxas. */
export function buildSalaDosDoces(): LevelBlueprint {
  return buildTreasureLevel({
    id: '6-S',
    name: 'Sala dos Doces',
    theme: THEME,
    floor: 'ground',
    welcome: 'A sala secreta dos doces!',
    mascotText: 'Quantos doces! Gostosuras para você, Pedro!',
    farewell: 'Os doces da bruxa são seus! 🍬',
  });
}
