import { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import { MAX_LEVEL_WIDTH, type PedrereLevel, TILE } from '../models/level.model';
import { GROUND_TOP, LevelSketch } from './level-sketch';

export interface Hurdle {
  readonly column: number;
  /** Um ou dois blocos: o pulo do Pedro passa pelos dois, mas o de dois pede o pulo inteiro. */
  readonly height: 1 | 2;
}

export interface RaceTrack {
  readonly level: PedrereLevel;
  readonly hurdles: readonly Hurdle[];
  /** Coluna da linha de chegada; quem passa dela terminou. */
  readonly finishColumn: number;
}

/** A pista é a fase mais longa que o jogo aceita: uns quinze segundos de corrida. */
const TRACK_WIDTH = MAX_LEVEL_WIDTH;
/** Longe o bastante da borda para os rivais largarem enfileirados atrás do Pedro. */
const START_COLUMN = 5;
const FIRST_HURDLE_COLUMN = 14;
const FINISH_MARGIN = 6;
const MIN_HURDLE_GAP = 9;
const MAX_HURDLE_GAP = 14;
const TALL_HURDLE_CHANCE = 0.3;

/**
 * Monta a pista da corrida: chão reto, obstáculos de tijolo e a chegada.
 *
 * A pista vem de uma semente: a mesma semente dá sempre a mesma pista, o que
 * deixa a corrida justa entre uma tentativa e a próxima e torna o teste
 * reproduzível.
 */
export function createRaceTrack(seed: number): RaceTrack {
  const random = new SeededRandom(seed);
  const finishColumn = TRACK_WIDTH - FINISH_MARGIN;
  const sketch = new LevelSketch(TRACK_WIDTH).ground(0, TRACK_WIDTH - 1).put(START_COLUMN, GROUND_TOP - 1, TILE.start);
  const hurdles: Hurdle[] = [];

  for (
    let column = FIRST_HURDLE_COLUMN;
    column < finishColumn - FINISH_MARGIN;
    column += random.integer(MIN_HURDLE_GAP, MAX_HURDLE_GAP)
  ) {
    const height: 1 | 2 = random.chance(TALL_HURDLE_CHANCE) ? 2 : 1;

    sketch.stack(column, GROUND_TOP - height, GROUND_TOP - 1, TILE.brick);
    hurdles.push({ column, height });
  }

  sketch.put(finishColumn, GROUND_TOP - 1, TILE.goal);

  return {
    level: { id: 'corrida', name: 'Corrida', theme: 'campo', rows: sketch.toRows() },
    hurdles,
    finishColumn,
  };
}
