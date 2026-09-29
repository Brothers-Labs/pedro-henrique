import { DEFAULT_LEVEL_HEIGHT } from '../../config/physics.config';
import type { LevelBlueprint } from '../../models/level.model';
import { LevelBuilder } from '../level-builder';

const SURFACE = 12;

/** Par que liga a porta da árvore à sala escondida nas copas. */
const TREETOP_DOOR = 'copa';

/**
 * 1-2 — Floresta Saltitante.
 *
 * Apresenta molas, plataformas móveis nos dois sentidos, a ponte que
 * desaparece, o Espinhudo (que não pode ser pisado) e o morcego. Uma porta no
 * tronco leva a uma sala escondida nas copas, onde fica a porta secreta que
 * libera a fase secreta do Vale Verde.
 */
export function buildFlorestaSaltitante(): LevelBlueprint {
  const builder = new LevelBuilder(160, DEFAULT_LEVEL_HEIGHT);
  const floor = SURFACE - 1;

  // Molas --------------------------------------------------------------------
  builder.ground(0, 14, SURFACE);
  builder.add('start', 3, floor);
  builder.add('mascot-tip', 4, floor, { text: 'Bem-vindo à Floresta Saltitante!' });
  builder.add('spring', 9, floor);
  builder.row('platform', 10, SURFACE - 7, 4);
  builder.coins(10, SURFACE - 8, 4);

  // Espinhudo ------------------------------------------------------------------
  builder.ground(15, 28, SURFACE);
  builder.add('hint', 16, SURFACE - 5, { text: 'NÃO PISE NO ESPINHUDO! PULE POR CIMA.' });
  builder.add('spiky', 20, floor);
  builder.coinArc(18, SURFACE - 3, 5);

  // Plataforma que sobe até o paredão ---------------------------------------------
  builder.add('hint', 24, SURFACE - 5, { text: 'SUBA NA PLATAFORMA!' });
  builder.add('moving-platform', 26, floor, { axis: 'vertical', range: 4 });
  builder.ground(29, 40, SURFACE - 5);
  builder.coins(30, SURFACE - 7, 4);
  builder.add('slime', 35, SURFACE - 6);
  builder.add('surprise', 37, SURFACE - 9, { contents: 'crystal' });

  // Morcego e a porta do tronco -------------------------------------------------------
  builder.ground(41, 55, SURFACE);
  builder.add('bat', 46, SURFACE - 4);
  builder.coins(44, SURFACE - 3, 3);
  builder.add('mascot-tip', 50, floor, { text: 'Hmm… essa porta na árvore leva para algum lugar?' });
  builder.add('hint', 51, SURFACE - 4, { text: 'APERTE E NA PORTA', touchText: 'Toque em AÇÃO na porta' });
  builder.add('door', 52, floor, { pair: TREETOP_DOOR });

  // Plataforma móvel sobre o buraco --------------------------------------------------
  builder.add('moving-platform', 57, SURFACE, { axis: 'horizontal', range: 4 });
  builder.coins(58, SURFACE - 3, 4);

  // Checkpoint e asa -------------------------------------------------------------
  builder.ground(64, 80, SURFACE);
  builder.add('checkpoint', 67, floor);
  builder.add('slime', 72, floor);
  builder.add('surprise', 74, SURFACE - 4, { contents: 'power-up', powerUp: 'wings' });
  builder.add('slime', 77, floor);

  // Ponte que desaparece ------------------------------------------------------------
  builder.add('hint', 79, SURFACE - 4, { text: 'CORRA! A PONTE DESAPARECE!' });
  builder.row('crumble', 81, SURFACE, 5);
  builder.coins(81, SURFACE - 2, 5);
  builder.ground(86, 158, SURFACE);

  builder.add('spiky', 90, floor);
  builder.add('bat', 95, SURFACE - 4);

  // Mola alta com cristal na copa ----------------------------------------------------
  builder.add('spring', 99, floor);
  builder.row('platform', 100, SURFACE - 7, 5);
  builder.coins(100, SURFACE - 8, 4);
  builder.add('crystal', 104, SURFACE - 8);

  buildTreetopRoom(builder);

  // Reta final ----------------------------------------------------------------------
  builder.add('slime', 126, floor);
  builder.add('spiky', 131, floor);
  builder.add('surprise', 134, SURFACE - 4, { contents: 'coins' });
  builder.add('slime', 138, floor);
  builder.coins(141, SURFACE - 3, 4);
  builder.add('portal', 150, floor);

  for (const x of [0, 13, 22, 43, 53, 66, 88, 108, 118, 128, 145, 156]) {
    builder.add('tree', x, floor);
  }

  for (const x of [6, 17, 47, 70, 93, 123, 147]) {
    builder.add('bush', x, floor);
  }

  return builder.build({
    id: '1-2',
    name: 'Floresta Saltitante',
    theme: 'floresta',
    targetTimeSeconds: 110,
  });
}

/**
 * Sala escondida nas copas: só se chega pela porta do tronco.
 *
 * Fica alta demais para qualquer pulo do chão, e as paredes fecham os lados.
 */
function buildTreetopRoom(builder: LevelBuilder): void {
  const left = 108;
  const right = 122;
  const ceiling = 1;
  const roomFloor = 6;

  builder.fill('stone', left, right, ceiling, ceiling);
  builder.fill('stone', left, right, roomFloor, roomFloor);
  builder.fill('stone', left, left, ceiling, roomFloor);
  builder.fill('stone', right, right, ceiling, roomFloor);

  builder.add('door', left + 2, roomFloor - 1, { pair: TREETOP_DOOR });
  builder.coins(left + 4, roomFloor - 2, 6);
  builder.add('crystal', left + 8, roomFloor - 3);
  builder.add('mascot-tip', left + 3, roomFloor - 1, { text: 'Uau! Uma sala secreta nas árvores!' });
  builder.add('sign', left + 11, roomFloor - 1, { text: 'Toque na porta dourada…' });
  builder.add('secret-door', left + 12, roomFloor - 1);
}
