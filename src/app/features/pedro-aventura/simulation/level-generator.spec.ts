import { DIFFICULTIES } from '../config/difficulty.config';
import { ALL_LEVELS, findLevel } from '../config/regions.config';
import { generateLayout } from './level-generator';
import { LANES, OBSTACLE_SIZE } from './track.model';

/** Obstáculos que se passam por cima ou por baixo, e por isso podem fechar as três faixas. */
const PASSABLE_IN_PLACE = new Set(['barrier', 'high-bar', 'cone', 'crate', 'sweeper']);

describe('generateLayout', () => {
  it('gera sempre a mesma pista para a mesma fase', () => {
    const level = findLevel('2-3');

    expect(level).not.toBeNull();

    if (level) {
      expect(generateLayout(level)).toEqual(generateLayout(level));
    }
  });

  it('mantém a pista do Fácil e põe mais obstáculos no Difícil', () => {
    const level = findLevel('3-5');

    if (!level) {
      fail('Fase 3-5 não existe.');
      return;
    }

    expect(generateLayout(level, 'facil')).toEqual(generateLayout(level));
    expect(generateLayout(level, 'dificil').obstacles.length).toBeGreaterThan(generateLayout(level, 'facil').obstacles.length);
  });

  for (const level of ALL_LEVELS) {
    for (const difficulty of DIFFICULTIES) {
      describe(`fase ${level.id} no ${difficulty.label}`, () => {
        const layout = generateLayout(level, difficulty.id);

        it('deixa sempre um jeito de passar em cada fileira', () => {
          const rows = new Map<number, string[]>();

          for (const obstacle of layout.obstacles) {
            rows.set(obstacle.z, [...(rows.get(obstacle.z) ?? []), obstacle.kind]);
          }

          for (const [z, kinds] of rows) {
            const isFull = kinds.length >= LANES.length;

            expect(!isFull || kinds.every((kind) => PASSABLE_IN_PLACE.has(kind)))
              .withContext(`fileira em ${z}m: ${kinds.join(', ')}`)
              .toBeTrue();
          }
        });

        it('não põe obstáculo perto da largada, da chegada nem dos checkpoints', () => {
          for (const obstacle of layout.obstacles) {
            const reach = OBSTACLE_SIZE[obstacle.kind].depth;

            expect(obstacle.z).toBeGreaterThan(30);
            expect(obstacle.z).toBeLessThan(layout.length - 20);

            for (const checkpoint of layout.checkpoints) {
              expect(Math.abs(obstacle.z - checkpoint)).withContext(`checkpoint ${checkpoint}`).toBeGreaterThan(8 - reach);
            }
          }
        });

        it('tem moedas, rampas e três coroas suficientes para os objetivos', () => {
          expect(layout.totals.coins).toBeGreaterThanOrEqual(level.coinTarget);
          expect(layout.totals.ramps).toBeGreaterThanOrEqual(level.rampTarget);
          expect(layout.totals.crowns).toBe(3);
        });

        it('nunca põe moeda dentro de um obstáculo', () => {
          for (const pickup of layout.pickups.filter((candidate) => candidate.y < 1.5)) {
            const clash = layout.obstacles.find(
              (obstacle) =>
                obstacle.kind !== 'traffic-car' &&
                obstacle.kind !== 'sweeper' &&
                obstacle.lane === pickup.lane &&
                Math.abs(obstacle.z - pickup.z) < OBSTACLE_SIZE[obstacle.kind].depth / 2 + 0.5,
            );

            expect(clash).withContext(`${pickup.kind} em ${pickup.z}m`).toBeUndefined();
          }
        });
      });
    }
  }
});
