import { generateLevel } from './level-generator';
import { LevelBuilder } from './level-builder';
import { analyzeReachability } from './level-reachability';

const META = { id: 'teste', name: 'Teste', theme: 'vale', targetTimeSeconds: 60 } as const;

function flatLevel(): LevelBuilder {
  const builder = new LevelBuilder(40, 15);
  builder.ground(0, 39, 12);
  builder.add('start', 2, 11);

  return builder;
}

describe('Validador de alcance', () => {
  it('aprova uma fase plana com o portal no fim', () => {
    const builder = flatLevel().add('portal', 35, 11);

    expect(analyzeReachability(builder.build(META)).isPortalReachable).toBeTrue();
  });

  it('aprova um buraco de três células', () => {
    const builder = flatLevel().clearColumns(15, 17).add('portal', 35, 11);

    expect(analyzeReachability(builder.build(META)).isPortalReachable).toBeTrue();
  });

  it('reprova um buraco largo demais para o pulo', () => {
    const builder = flatLevel().clearColumns(15, 24).add('portal', 35, 11);

    expect(analyzeReachability(builder.build(META)).isPortalReachable).toBeFalse();
  });

  it('reprova uma parede alta demais e aprova a mesma parede com mola', () => {
    const wall = flatLevel().fill('stone', 20, 21, 5, 11).add('portal', 35, 11);

    expect(analyzeReachability(wall.build(META)).isPortalReachable).toBeFalse();

    wall.add('spring', 17, 11);

    expect(analyzeReachability(wall.build(META)).isPortalReachable).toBeTrue();
  });

  it('trata a lava como perigo, e não como chão', () => {
    const builder = flatLevel().clearColumns(15, 24).fill('lava', 15, 24, 12, 12).add('portal', 35, 11);

    expect(analyzeReachability(builder.build(META)).isPortalReachable).toBeFalse();
  });

  it('atravessa portas ligadas pelo mesmo par', () => {
    const builder = flatLevel()
      .fill('stone', 20, 21, 0, 11)
      .add('door', 18, 11, { pair: 'a' })
      .add('door', 25, 11, { pair: 'a' })
      .add('portal', 35, 11);

    expect(analyzeReachability(builder.build(META)).isPortalReachable).toBeTrue();
  });

  it('aponta moedas fora de alcance', () => {
    const builder = flatLevel().add('portal', 35, 11).add('coin', 10, 2);
    const report = analyzeReachability(builder.build(META));

    expect(report.unreachableCollectibles.map((object) => object.type)).toEqual(['coin']);
  });
});

describe('Gerador de fase surpresa', () => {
  it('produz fases completáveis em todas as dificuldades', () => {
    for (let difficulty = 1; difficulty <= 5; difficulty += 1) {
      for (let seed = 1; seed <= 12; seed += 1) {
        const level = generateLevel({
          id: `surpresa-${difficulty}-${seed}`,
          name: 'Surpresa',
          seed: seed * 101 + difficulty,
          theme: difficulty === 4 ? 'vulcao' : 'vale',
          difficulty,
          width: 90 + difficulty * 10,
          enemies: ['slime', 'spiky', 'bat'],
        });
        const report = analyzeReachability(level);

        expect(report.isPortalReachable).withContext(`dificuldade ${difficulty}, semente ${seed}`).toBeTrue();
        expect(report.unreachableCollectibles.length).withContext('coletáveis fora de alcance').toBe(0);
      }
    }
  });
});
