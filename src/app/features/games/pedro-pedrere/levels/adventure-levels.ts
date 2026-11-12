import { type PedrereLevel, TILE } from '../models/level.model';
import { LevelSketch } from './level-sketch';

const { brick, checkpoint, coin, goal, pebble, spike, start, trampoline } = TILE;

/**
 * As fases prontas do modo Aventuras, da mais fácil para a mais difícil.
 *
 * O pulo do Pedro sobe quase três blocos e o pula-pula, mais de seis: toda
 * plataforma daqui fica a no máximo dois blocos do chão, a não ser as que
 * têm um pula-pula embaixo.
 */

const primeirosPulos = new LevelSketch(64)
  .ground(0, 19)
  .ground(22, 39)
  .ground(43, 63)
  .put(2, 11, start)
  .line(6, 10, 3, coin)
  .line(10, 10, 3, brick)
  .line(10, 9, 3, coin)
  .put(16, 11, pebble)
  .line(20, 9, 2, coin)
  .put(26, 11, brick)
  .stack(27, 10, 11, brick)
  .put(27, 9, coin)
  .put(30, 11, checkpoint)
  .put(34, 11, pebble)
  .put(38, 11, trampoline)
  .line(39, 6, 3, coin)
  .line(46, 10, 4, brick)
  .line(46, 9, 4, coin)
  .line(51, 11, 2, spike)
  .put(55, 11, pebble)
  .line(56, 10, 3, coin)
  .put(61, 11, goal);

const praiaDoPulaPula = new LevelSketch(72)
  .ground(0, 13)
  .ground(18, 33)
  .ground(36, 51)
  .ground(55, 71)
  .put(2, 11, start)
  .put(9, 11, pebble)
  .put(12, 11, trampoline)
  .line(14, 6, 4, coin)
  .put(20, 11, trampoline)
  .line(22, 6, 5, brick)
  .line(22, 5, 5, coin)
  .line(28, 11, 3, spike)
  .put(32, 11, checkpoint)
  .put(38, 11, brick)
  .stack(39, 10, 11, brick)
  .stack(40, 9, 11, brick)
  .put(40, 8, coin)
  .put(44, 11, pebble)
  .put(48, 11, pebble)
  .put(50, 11, trampoline)
  .line(57, 10, 4, coin)
  .put(62, 11, spike)
  .put(69, 11, goal);

const noiteDasPedrinhas = new LevelSketch(80)
  .ground(0, 15)
  .ground(19, 33)
  .ground(37, 55)
  .ground(59, 79)
  .put(2, 11, start)
  .put(8, 11, pebble)
  .put(12, 11, pebble)
  .line(20, 10, 4, brick)
  .line(20, 9, 4, coin)
  .put(23, 11, pebble)
  .line(26, 11, 2, spike)
  .put(30, 11, pebble)
  .put(32, 11, checkpoint)
  .line(40, 10, 3, brick)
  .line(44, 8, 3, brick)
  .line(44, 7, 3, coin)
  .put(46, 11, pebble)
  .put(50, 11, pebble)
  .put(52, 11, checkpoint)
  .put(63, 11, pebble)
  .line(66, 11, 2, spike)
  .put(70, 11, pebble)
  .line(72, 10, 3, coin)
  .put(77, 11, goal);

const montanhaDeNeve = new LevelSketch(88)
  .ground(0, 11)
  .ground(12, 23, 10)
  .ground(26, 35, 8)
  .ground(38, 47, 11)
  .ground(50, 70)
  .ground(73, 87, 9)
  .put(2, 11, start)
  .line(5, 10, 3, coin)
  .put(18, 9, pebble)
  .line(27, 7, 3, coin)
  .put(31, 7, pebble)
  .put(34, 7, checkpoint)
  .put(46, 10, trampoline)
  .line(48, 5, 6, brick)
  .line(48, 4, 6, coin)
  .line(56, 11, 2, spike)
  .put(60, 11, pebble)
  .put(64, 11, checkpoint)
  .put(68, 11, brick)
  .stack(69, 10, 11, brick)
  .stack(70, 9, 11, brick)
  .line(76, 8, 4, coin)
  .put(80, 8, pebble)
  .put(85, 8, goal);

export const ADVENTURE_LEVELS: readonly PedrereLevel[] = [
  { id: 'primeiros-pulos', name: 'Primeiros pulos', theme: 'campo', rows: primeirosPulos.toRows() },
  { id: 'praia-do-pula-pula', name: 'Praia do pula-pula', theme: 'praia', rows: praiaDoPulaPula.toRows() },
  { id: 'noite-das-pedrinhas', name: 'Noite das pedrinhas', theme: 'noite', rows: noiteDasPedrinhas.toRows() },
  { id: 'montanha-de-neve', name: 'Montanha de neve', theme: 'neve', rows: montanhaDeNeve.toRows() },
];

export function adventureLevel(levelId: string): PedrereLevel | null {
  return ADVENTURE_LEVELS.find((level) => level.id === levelId) ?? null;
}
