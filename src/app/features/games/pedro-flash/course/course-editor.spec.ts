import { traceRoute } from '../../pedro-kart/tracks/default-tracks';
import {
  commitDraft,
  createEditorHistory,
  createEmptyDraft,
  erasePiece,
  extendPath,
  placePiece,
  shortenPath,
  undoDraft,
  type CourseDraft,
} from './course-editor';

function drawn(route: string): CourseDraft {
  return { ...createEmptyDraft(), path: traceRoute({ column: 0, row: 5 }, route) };
}

describe('Editor do Pedro Flash Maker', () => {
  it('desenha o caminho casa por casa e apaga ao voltar o dedo', () => {
    let draft = createEmptyDraft();

    draft = extendPath(draft, { column: 1, row: 1 });
    draft = extendPath(draft, { column: 2, row: 1 });
    draft = extendPath(draft, { column: 4, row: 1 });
    draft = extendPath(draft, { column: 3, row: 1 });

    expect(draft.path).toEqual([
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 3, row: 1 },
    ]);

    draft = extendPath(draft, { column: 2, row: 1 });

    expect(draft.path.length).toBe(2);
  });

  it('gira a faixa da peça a cada toque e tira depois da direita', () => {
    const cell = { column: 4, row: 5 };
    let result = placePiece(drawn('R12'), cell, 'espinhos');

    expect(result.draft.pieces).toEqual([{ cell: 4, kind: 'espinhos', lane: 0 }]);

    result = placePiece(result.draft, cell, 'espinhos');
    expect(result.draft.pieces[0].lane).toBe(-1);

    result = placePiece(result.draft, cell, 'espinhos');
    expect(result.draft.pieces[0].lane).toBe(1);

    result = placePiece(result.draft, cell, 'espinhos');
    expect(result.draft.pieces).toEqual([]);
  });

  it('tira no segundo toque a peça que ocupa a pista inteira', () => {
    const cell = { column: 4, row: 5 };
    const once = placePiece(drawn('R12'), cell, 'mola').draft;

    expect(placePiece(once, cell, 'mola').draft.pieces).toEqual([]);
  });

  it('conta por que a peça não coube, sem mudar nada', () => {
    const draft = drawn('R6 U3 R6');
    const result = placePiece(draft, { column: 6, row: 5 }, 'loop');

    expect(result.problem).toBe('curva');
    expect(result.draft).toBe(draft);
  });

  it('troca a peça da casa e apaga com a borracha', () => {
    const cell = { column: 4, row: 5 };
    const withSpring = placePiece(drawn('R12'), cell, 'mola').draft;
    const withTurbo = placePiece(withSpring, cell, 'turbo').draft;

    expect(withTurbo.pieces).toEqual([{ cell: 4, kind: 'turbo', lane: 0 }]);
    expect(erasePiece(withTurbo, cell).pieces).toEqual([]);
  });

  it('leva junto as peças que ficaram fora ao encurtar o caminho, deixando a chegada livre', () => {
    const draft = { ...drawn('R12'), pieces: [{ cell: 4, kind: 'raios', lane: 0 } as const, { cell: 9, kind: 'mola', lane: 0 } as const] };

    expect(shortenPath(draft, 5).pieces).toEqual([]);
    expect(shortenPath(draft, 6).pieces).toEqual([{ cell: 4, kind: 'raios', lane: 0 }]);
  });

  it('desfaz passo a passo e ignora mudança que não muda nada', () => {
    const first = drawn('R12');
    const second = placePiece(first, { column: 3, row: 5 }, 'turbo').draft;
    let history = createEditorHistory(first);

    history = commitDraft(history, second);
    history = commitDraft(history, second);

    expect(history.past.length).toBe(1);
    expect(undoDraft(history).present).toBe(first);
  });
});
