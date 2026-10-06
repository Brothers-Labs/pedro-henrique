import { TRACK_GRID, type GridCell } from '../models/track.model';
import {
  changeLaps,
  commitDraft,
  createEditorHistory,
  createEmptyDraft,
  directionArrow,
  extendPath,
  toggleMarker,
  undoDraft,
  type TrackDraft,
} from './track-editor';

function draw(cells: readonly GridCell[]): TrackDraft {
  return cells.reduce(extendPath, createEmptyDraft());
}

const A: GridCell = { column: 2, row: 2 };
const B: GridCell = { column: 3, row: 2 };
const C: GridCell = { column: 4, row: 2 };

describe('Editor do Pedro Kart Maker', () => {
  it('desenha casa por casa, só entre vizinhas', () => {
    const draft = draw([A, B, C, { column: 6, row: 2 }, { column: 5, row: 3 }]);

    expect(draft.path).toEqual([A, B, C]);
  });

  it('apaga o último pedaço quando o dedo volta pelo mesmo caminho', () => {
    expect(draw([A, B, C, B]).path).toEqual([A, B]);
  });

  it('não deixa a pista passar duas vezes pela mesma casa nem sair do mapa', () => {
    const square = draw([A, B, { column: 3, row: 3 }, { column: 2, row: 3 }]);

    expect(extendPath(square, A)).toBe(square);
    expect(extendPath(createEmptyDraft(), { column: TRACK_GRID.columns, row: 0 }).path).toEqual([]);
  });

  it('põe e tira turbo e caixa, um por casa e nunca na largada', () => {
    const base = draw([A, B, C]);
    const withBoost = toggleMarker(base, C, 'turbo');

    expect(withBoost.boostCells).toEqual([2]);
    expect(toggleMarker(withBoost, C, 'caixa')).toEqual(jasmine.objectContaining({ boostCells: [], itemCells: [2] }));
    expect(toggleMarker(withBoost, C, 'turbo').boostCells).toEqual([]);
    expect(toggleMarker(base, A, 'turbo')).toBe(base);
    expect(toggleMarker(base, { column: 9, row: 9 }, 'caixa')).toBe(base);
  });

  it('leva junto o turbo de uma casa apagada', () => {
    const withBoost = toggleMarker(draw([A, B, C]), C, 'turbo');

    expect(extendPath(withBoost, B).boostCells).toEqual([]);
  });

  it('mantém as voltas entre o mínimo e o máximo', () => {
    expect(changeLaps(createEmptyDraft(), 99).laps).toBe(TRACK_GRID.maximumLaps);
    expect(changeLaps(createEmptyDraft(), -99).laps).toBe(TRACK_GRID.minimumLaps);
  });

  it('desfaz na ordem certa e ignora mudança que não muda nada', () => {
    const first = draw([A]);
    const second = extendPath(first, B);
    const history = commitDraft(commitDraft(createEditorHistory(first), second), second);

    expect(history.past.length).toBe(1);
    expect(undoDraft(history).present).toBe(first);
    expect(undoDraft(undoDraft(history)).present).toBe(first);
  });

  it('mostra a seta no sentido da corrida', () => {
    expect(directionArrow(A, B)).toBe('→');
    expect(directionArrow(B, A)).toBe('←');
    expect(directionArrow(A, { column: 2, row: 3 })).toBe('↓');
    expect(directionArrow(A, { column: 2, row: 1 })).toBe('↑');
  });
});
