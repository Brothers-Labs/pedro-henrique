import { LEVEL_HEIGHT, TILE } from '../models/level.model';
import { ADVENTURE_LEVELS, adventureLevel } from './adventure-levels';
import { createBlankRows, paintTile, resizeRows } from './level-editor';
import { findLevelProblems, layoutLevel } from './level-layout';
import { LevelSketch } from './level-sketch';
import { createRaceTrack } from './race-track';

describe('Fases do Pedro Pedrerê', () => {
  it('todas as fases prontas podem ser jogadas e têm moedas', () => {
    for (const level of ADVENTURE_LEVELS) {
      expect(findLevelProblems(level.rows)).withContext(level.name).toEqual([]);
      expect(layoutLevel(level).coins.length).withContext(level.name).toBeGreaterThan(0);
    }
  });

  it('acha a fase pronta pelo id e não inventa a que não existe', () => {
    expect(adventureLevel('primeiros-pulos')?.name).toBe('Primeiros pulos');
    expect(adventureLevel('nao-existe')).toBeNull();
  });

  it('aponta cada problema que impede a fase de ser jogada', () => {
    const blank = new LevelSketch(30).ground(0, 29).toRows();

    expect(findLevelProblems(blank)).toEqual(['sem-inicio', 'sem-chegada']);
    expect(findLevelProblems(blank.slice(1))).toEqual(['tamanho-invalido']);
    expect(findLevelProblems(blank.map((row) => row.slice(0, 10)))).toEqual(['tamanho-invalido']);

    const doubled = new LevelSketch(30).put(1, 1, TILE.start).put(2, 1, TILE.start).put(3, 1, TILE.goal).put(4, 1, TILE.goal);

    expect(findLevelProblems(doubled.toRows())).toEqual(['inicio-repetido', 'chegada-repetida']);
    expect(findLevelProblems(createBlankRows(30).map((row, index) => (index === 0 ? `X${row.slice(1)}` : row)))).toEqual(
      ['bloco-desconhecido'],
    );
  });

  it('separa o cenário fixo do que se mexe e trata as bordas como parede', () => {
    const rows = new LevelSketch(30)
      .ground(0, 29)
      .put(1, 11, TILE.start)
      .put(28, 11, TILE.goal)
      .put(5, 10, TILE.coin)
      .put(6, 11, TILE.pebble)
      .put(7, 11, TILE.checkpoint)
      .put(8, 11, TILE.spike)
      .toRows();
    const layout = layoutLevel({ id: 'teste', name: 'Teste', theme: 'campo', rows });

    expect(layout.start).toEqual({ column: 1, row: 11 });
    expect(layout.goal).toEqual({ column: 28, row: 11 });
    expect(layout.coins).toEqual([{ column: 5, row: 10 }]);
    expect(layout.pebbles).toEqual([{ column: 6, row: 11 }]);
    expect(layout.checkpoints).toEqual([{ column: 7, row: 11 }]);
    expect(layout.terrainAt(8, 11)).toBe('spike');
    expect(layout.terrainAt(5, 10)).toBe('empty');
    expect(layout.terrainAt(-1, 5)).toBe('ground');
    expect(layout.terrainAt(30, 5)).toBe('ground');
    expect(layout.terrainAt(4, LEVEL_HEIGHT)).toBe('empty');
  });

  it('falha alto ao ler uma fase quebrada', () => {
    expect(() => layoutLevel({ id: 'x', name: 'Quebrada', theme: 'campo', rows: [] })).toThrowError(/Quebrada/);
  });

  it('o rascunho recusa bloco fora da grade', () => {
    expect(() => new LevelSketch(30).put(30, 0, TILE.brick)).toThrowError(/fora da fase/);
  });
});

describe('Editor do modo maker', () => {
  it('a fase em branco já nasce jogável', () => {
    expect(findLevelProblems(createBlankRows(40))).toEqual([]);
    expect(() => createBlankRows(5)).toThrowError(/inválida/);
  });

  it('pinta sem mexer na grade anterior', () => {
    const rows = createBlankRows(40);
    const painted = paintTile(rows, 10, 5, TILE.brick);

    expect(painted[5][10]).toBe(TILE.brick);
    expect(rows[5][10]).toBe(TILE.empty);
  });

  it('o início e a chegada mudam de lugar em vez de duplicar', () => {
    const rows = paintTile(paintTile(createBlankRows(40), 20, 4, TILE.start), 25, 4, TILE.goal);

    expect(findLevelProblems(rows)).toEqual([]);
    expect(rows.join('').split(TILE.start).length - 1).toBe(1);
    expect(rows[4][20]).toBe(TILE.start);
    expect(rows[4][25]).toBe(TILE.goal);
  });

  it('ignora toque fora da grade ou no mesmo bloco', () => {
    const rows = createBlankRows(40);

    expect(paintTile(rows, 99, 3, TILE.coin)).toBe(rows);
    expect(paintTile(rows, 3, 3, TILE.empty)).toBe(rows);
  });

  it('estica a fase com chão e corta o fim', () => {
    const longer = resizeRows(createBlankRows(40), 70);
    const shorter = resizeRows(createBlankRows(70), 40);

    expect(longer.every((row) => row.length === 70)).toBeTrue();
    expect(longer[LEVEL_HEIGHT - 1].endsWith(TILE.ground.repeat(30))).toBeTrue();
    expect(longer[0].endsWith(TILE.empty.repeat(30))).toBeTrue();
    expect(findLevelProblems(shorter)).toEqual(['sem-chegada']);
  });
});

describe('Pista da corrida', () => {
  it('a mesma semente monta a mesma pista, jogável e com obstáculos', () => {
    const track = createRaceTrack(42);

    expect(createRaceTrack(42)).toEqual(track);
    expect(findLevelProblems(track.level.rows)).toEqual([]);
    expect(track.hurdles.length).toBeGreaterThan(5);
    expect(track.hurdles.every((hurdle) => hurdle.column < track.finishColumn)).toBeTrue();
  });
});
