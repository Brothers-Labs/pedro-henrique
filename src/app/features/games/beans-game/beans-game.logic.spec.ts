import {
  BeanCell,
  canFly,
  chooseBeanMove,
  chooseBeanToRemove,
  destinationsFrom,
  EMPTY_BEAN_BOARD,
  formsMill,
  hasAnyMove,
  MILLS,
  NEIGHBOURS,
  removablePositions,
  withBean,
} from './beans-game.logic';

/** Monta um tabuleiro colocando os feijões nas posições informadas. */
function boardWith(
  brown: readonly number[],
  white: readonly number[] = [],
): readonly BeanCell[] {
  const withBrown = brown.reduce<readonly BeanCell[]>(
    (board, position) => withBean(board, position, 'crianca'),
    EMPTY_BEAN_BOARD,
  );

  return white.reduce<readonly BeanCell[]>(
    (board, position) => withBean(board, position, 'rival'),
    withBrown,
  );
}

describe('tabuleiro da trilha', () => {
  it('tem 24 casas e 16 trilhas possíveis', () => {
    expect(EMPTY_BEAN_BOARD.length).toBe(24);
    expect(MILLS.length).toBe(16);
  });

  it('mantém as ligações entre casas sempre nos dois sentidos', () => {
    NEIGHBOURS.forEach((neighbours, position) => {
      for (const neighbour of neighbours) {
        expect(NEIGHBOURS[neighbour])
          .withContext(`casa ${neighbour} deveria apontar de volta para ${position}`)
          .toContain(position);
      }
    });
  });

  it('não deixa nenhuma casa isolada', () => {
    expect(NEIGHBOURS.every((neighbours) => neighbours.length >= 2)).toBeTrue();
  });
});

describe('formsMill', () => {
  it('reconhece três feijões em linha', () => {
    expect(formsMill(boardWith([0, 1, 2]), 1, 'crianca')).toBeTrue();
  });

  it('não considera trilha uma linha incompleta', () => {
    expect(formsMill(boardWith([0, 1]), 1, 'crianca')).toBeFalse();
  });

  it('não considera trilha uma linha com feijões misturados', () => {
    expect(formsMill(boardWith([0, 1], [2]), 1, 'crianca')).toBeFalse();
  });
});

describe('removablePositions', () => {
  it('protege os feijões que estão dentro de uma trilha', () => {
    const board = boardWith([], [0, 1, 2, 4]);

    expect(removablePositions(board, 'rival')).toEqual([4]);
  });

  it('libera todos quando não há feijão fora de trilha', () => {
    const board = boardWith([], [0, 1, 2]);

    expect(removablePositions(board, 'rival')).toEqual([0, 1, 2]);
  });
});

describe('movimentação', () => {
  it('só permite andar para casas vizinhas vazias', () => {
    const board = boardWith([0], [1]);

    expect(destinationsFrom(board, 0, false)).toEqual([9]);
  });

  it('permite voar para qualquer casa vazia', () => {
    const board = boardWith([0, 4, 8]);

    expect(destinationsFrom(board, 0, true).length).toBe(21);
  });

  it('libera o voo apenas com três feijões e a mão vazia', () => {
    expect(canFly(3, 0)).toBeTrue();
    expect(canFly(3, 1)).toBeFalse();
    expect(canFly(4, 0)).toBeFalse();
  });

  it('detecta quando o jogador ficou sem ter para onde andar', () => {
    const board = boardWith([0], [1, 9]);

    expect(hasAnyMove(board, 'crianca', 0)).toBeFalse();
  });

  it('considera que sempre há jogada enquanto restam feijões na mão', () => {
    expect(hasAnyMove(EMPTY_BEAN_BOARD, 'crianca', 9)).toBeTrue();
  });
});

describe('chooseBeanMove', () => {
  it('fecha a própria trilha quando pode', () => {
    const board = boardWith([0, 1]);

    expect(chooseBeanMove(board, 'crianca', 7)?.to).toBe(2);
  });

  it('bloqueia a trilha do adversário', () => {
    const board = boardWith([], [3, 4]);

    expect(chooseBeanMove(board, 'crianca', 9)?.to).toBe(5);
  });

  it('devolve null quando não existe jogada possível', () => {
    const board = boardWith([0], [1, 9]);

    expect(chooseBeanMove(board, 'crianca', 0)).toBeNull();
  });
});

describe('chooseBeanToRemove', () => {
  it('come o feijão que está prestes a fechar uma trilha', () => {
    const board = boardWith([], [3, 4, 23]);

    expect([3, 4]).toContain(chooseBeanToRemove(board, 'rival')!);
  });

  it('devolve null quando o adversário não tem feijões', () => {
    expect(chooseBeanToRemove(EMPTY_BEAN_BOARD, 'rival')).toBeNull();
  });
});
