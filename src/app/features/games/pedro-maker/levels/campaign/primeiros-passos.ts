import { DEFAULT_LEVEL_HEIGHT } from '../../config/physics.config';
import type { LevelBlueprint } from '../../models/level.model';
import { LevelBuilder } from '../level-builder';

/** Linha do chão da fase: o Pedro pisa na linha logo acima dela. */
const SURFACE = 12;

/**
 * 1-1 — Primeiros Passos.
 *
 * Ensina jogando, sem nenhuma tela de tutorial: cada trecho apresenta uma
 * única ideia nova, e só depois a combina com as anteriores. A ordem é a do
 * roteiro do jogo: andar, pular, moedas, inimigo, cristal, plataforma,
 * checkpoint, power-up, um pequeno desafio e o portal.
 */
export function buildPrimeirosPassos(): LevelBlueprint {
  const builder = new LevelBuilder(150, DEFAULT_LEVEL_HEIGHT);
  const floor = SURFACE - 1;

  // Andar ------------------------------------------------------------------
  builder.ground(0, 24, SURFACE);
  builder.add('sign', 1, floor, { text: 'Bem-vindo ao Vale Verde!' });
  builder.add('start', 3, floor);
  builder.add('mascot-tip', 4, floor, { text: 'Oi, Pedro! Vamos começar a aventura?' });
  builder.add('hint', 5, SURFACE - 4, { text: '← →  PARA ANDAR', touchText: 'Use ◀ ▶ para andar' });
  builder.coins(8, floor, 4);

  // Pular ------------------------------------------------------------------
  builder.add('hint', 12, SURFACE - 4, { text: '↑  PARA PULAR', touchText: 'Toque em PULAR' });
  builder.fill('ground', 14, 15, SURFACE - 1, SURFACE - 1);
  builder.fill('ground', 19, 21, SURFACE - 2, SURFACE - 1);
  builder.coins(19, SURFACE - 4, 3);

  // Primeiro buraco, com as moedas desenhando o pulo.
  builder.coinArc(24, SURFACE - 3, 5);
  builder.ground(27, 60, SURFACE);

  // Inimigo ----------------------------------------------------------------
  builder.add('hint', 30, SURFACE - 4, { text: 'PULE EM CIMA DO SLIME!' });
  builder.add('slime', 34, floor);

  // Cristal escondido --------------------------------------------------------
  builder.add('mascot-tip', 37, floor, { text: 'Pedro! Tem um cristal escondido por perto!' });
  builder.add('hint', 38, SURFACE - 7, { text: 'BATA A CABEÇA NO BLOCO ?' });
  builder.add('surprise', 39, SURFACE - 4, { contents: 'coins' });
  builder.add('brick', 40, SURFACE - 4);
  builder.add('surprise', 41, SURFACE - 4, { contents: 'crystal' });
  builder.add('brick', 42, SURFACE - 4);
  builder.coins(45, SURFACE - 3, 3);
  builder.add('slime', 49, floor);
  builder.add('slime', 55, floor);

  // Plataforma ---------------------------------------------------------------
  builder.row('platform', 62, SURFACE - 2, 3);
  builder.coins(62, SURFACE - 3, 3);
  builder.ground(68, 90, SURFACE);

  // Checkpoint ---------------------------------------------------------------
  builder.add('checkpoint', 71, floor);

  // Power-up e mola ------------------------------------------------------------
  builder.add('surprise', 76, SURFACE - 4, { contents: 'power-up', powerUp: 'super-jump' });
  builder.add('mascot-tip', 78, floor, { text: 'Uma mola! Pule nela para subir bem alto!' });
  builder.add('spring', 80, floor);
  builder.row('platform', 81, SURFACE - 7, 5);
  builder.coins(81, SURFACE - 8, 4);
  builder.add('crystal', 85, SURFACE - 8);

  // Plataforma móvel -------------------------------------------------------------
  builder.add('moving-platform', 92, SURFACE, { axis: 'horizontal', range: 4 });
  builder.coins(93, SURFACE - 3, 4);
  builder.ground(99, 149, SURFACE);

  // Pequeno desafio: escada de pedra, cristal no alto e dois slimes. ----------------
  builder.fill('stone', 104, 110, SURFACE - 1, SURFACE - 1);
  builder.fill('stone', 105, 109, SURFACE - 2, SURFACE - 2);
  builder.fill('stone', 106, 108, SURFACE - 3, SURFACE - 3);
  builder.add('crystal', 107, SURFACE - 7);
  builder.coins(112, SURFACE - 3, 5);
  builder.add('slime', 114, floor);
  builder.add('surprise', 117, SURFACE - 4, { contents: 'heart' });
  builder.add('slime', 120, floor);

  builder.clearColumns(124, 125);
  builder.coinArc(123, SURFACE - 3, 4);

  // Portal -----------------------------------------------------------------------
  builder.add('sign', 136, floor, { text: 'Dino aprova! 🦖' });
  builder.add('mascot-tip', 138, floor, { text: 'Olha o portal! Vamos para a próxima!' });
  builder.add('portal', 142, floor);

  for (const x of [0, 17, 29, 58, 70, 88, 101, 128, 146]) {
    builder.add('tree', x, floor);
  }

  for (const x of [7, 23, 44, 69, 100, 133]) {
    builder.add('bush', x, floor);
  }

  for (const x of [2, 13, 32, 52, 74, 111, 131, 140]) {
    builder.add('flower', x, floor);
  }

  return builder.build({
    id: '1-1',
    name: 'Primeiros Passos',
    theme: 'vale',
    targetTimeSeconds: 90,
  });
}
