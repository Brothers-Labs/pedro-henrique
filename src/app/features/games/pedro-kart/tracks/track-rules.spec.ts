import { TRACK_GRID, type GridCell } from '../models/track.model';
import { DEFAULT_TRACKS, traceRoute } from './default-tracks';
import { clampLaps, findTrackProblems, normalizeTrackName, sanitizeCellIndexes, sanitizeTrack } from './track-rules';

const SQUARE: readonly GridCell[] = traceRoute({ column: 1, row: 1 }, 'R3 D3 L3 U2');

describe('Regras das pistas do Pedro Kart', () => {
  it('aceita um circuito fechado', () => {
    expect(findTrackProblems(SQUARE)).toEqual([]);
  });

  it('pede mais casas quando o circuito é curto', () => {
    expect(findTrackProblems(traceRoute({ column: 0, row: 0 }, 'R1 D1 L1'))).toEqual(['curto-demais']);
  });

  it('avisa quando a volta não fecha', () => {
    expect(findTrackProblems(traceRoute({ column: 1, row: 1 }, 'R4 D4 L3'))).toEqual(['aberto']);
  });

  it('recusa casa repetida, passo na diagonal e casa fora do mapa', () => {
    expect(findTrackProblems([...SQUARE, SQUARE[0]])).toEqual(['casa-repetida']);
    expect(findTrackProblems([{ column: 0, row: 0 }, { column: 1, row: 1 }])).toContain('passo-torto');
    expect(findTrackProblems([{ column: TRACK_GRID.columns, row: 0 }])).toEqual(['fora-da-grade']);
  });

  it('não aceita passo inválido no traçado escrito à mão', () => {
    expect(() => traceRoute({ column: 0, row: 0 }, 'X3')).toThrowError(/inválido/);
  });

  it('garante que as cinco pistas oficiais estão prontas para correr', () => {
    expect(DEFAULT_TRACKS.length).toBe(5);
    expect(new Set(DEFAULT_TRACKS.map((track) => track.theme)).size).toBe(5);

    for (const track of DEFAULT_TRACKS) {
      expect(findTrackProblems(track.path)).withContext(track.name).toEqual([]);
      expect(sanitizeCellIndexes(track.boostCells, track.path.length)).withContext(track.name).toEqual(track.boostCells);
      expect(sanitizeCellIndexes(track.itemCells, track.path.length)).withContext(track.name).toEqual(track.itemCells);
    }
  });

  it('limita as voltas e limpa o nome', () => {
    expect(clampLaps(0)).toBe(TRACK_GRID.minimumLaps);
    expect(clampLaps(99)).toBe(TRACK_GRID.maximumLaps);
    expect(clampLaps(Number.NaN)).toBe(TRACK_GRID.minimumLaps);
    expect(normalizeTrackName('   Pista   do   Pedro  ', 'x')).toBe('Pista do Pedro');
    expect(normalizeTrackName('    ', 'Minha pista')).toBe('Minha pista');
  });

  it('descarta pista corrompida e conserta o que dá para consertar', () => {
    expect(sanitizeTrack(null)).toBeNull();
    expect(sanitizeTrack({ id: 'a', name: 'A', theme: 'lua', laps: 3, path: SQUARE })).toBeNull();
    expect(sanitizeTrack({ id: 'a', name: 'A', theme: 'parque', laps: 3, path: SQUARE.slice(0, 5) })).toBeNull();

    const repaired = sanitizeTrack({
      id: 'a',
      name: '  Minha  ',
      theme: 'praia',
      laps: 12,
      path: SQUARE,
      boostCells: [0, 2, 2, 99, 1.5, 'x'],
      itemCells: 'nada',
    });

    expect(repaired).toEqual({
      id: 'a',
      name: 'Minha',
      theme: 'praia',
      laps: TRACK_GRID.maximumLaps,
      path: SQUARE,
      boostCells: [2],
      itemCells: [],
    });
  });
});
