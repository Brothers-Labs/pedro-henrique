import {
  Cell,
  chooseComputerMove,
  COMPUTER,
  EMPTY_BOARD,
  findWinningLine,
  HUMAN,
} from './tic-tac-toe.logic';

/** Monta um tabuleiro a partir de uma string de 9 posições (`x`, `o`, `.`). */
function boardFrom(layout: string): readonly Cell[] {
  return [...layout].map((symbol) => (symbol === 'x' ? HUMAN : symbol === 'o' ? COMPUTER : null));
}

describe('findWinningLine', () => {
  it('encontra uma linha horizontal completa', () => {
    expect(findWinningLine(boardFrom('xxx' + 'oo.' + '...'))).toEqual([0, 1, 2]);
  });

  it('encontra uma diagonal completa', () => {
    expect(findWinningLine(boardFrom('o.x' + '.ox' + '..o'))).toEqual([0, 4, 8]);
  });

  it('devolve null quando ninguém venceu', () => {
    expect(findWinningLine(EMPTY_BOARD)).toBeNull();
  });
});

describe('chooseComputerMove', () => {
  it('fecha o jogo quando tem a vitória disponível', () => {
    expect(chooseComputerMove(boardFrom('oo.' + 'xx.' + '...'))).toBe(2);
  });

  it('bloqueia a vitória do jogador', () => {
    expect(chooseComputerMove(boardFrom('xx.' + 'o..' + '...'))).toBe(2);
  });

  it('prefere vencer a bloquear quando as duas jogadas existem', () => {
    expect(chooseComputerMove(boardFrom('oo.' + 'xx.' + '..x'))).toBe(2);
  });

  it('ocupa o centro quando ele está livre', () => {
    expect(chooseComputerMove(boardFrom('x..' + '...' + '...'))).toBe(4);
  });

  it('devolve null quando o tabuleiro está cheio', () => {
    expect(chooseComputerMove(boardFrom('xoxoxoxox'))).toBeNull();
  });
});
