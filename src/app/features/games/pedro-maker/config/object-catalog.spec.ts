import { EDITOR_CATEGORIES, EDITOR_PIECES, EDITOR_TABS, editorPiecesIn, findEditorPiece, OBJECT_BEHAVIOR, sortByLabel } from './object-catalog';

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

function isAlphabetical(labels: readonly string[]): boolean {
  return labels.every((label, index) => index === 0 || collator.compare(labels[index - 1], label) <= 0);
}

describe('Ordem alfabética do editor do Pedro Maker', () => {
  it('mostra as abas em ordem alfabética, com a aba Telas no lugar dela pela letra', () => {
    expect(EDITOR_TABS.map((tab) => tab.label)).toEqual([
      'Bandeiras',
      'Blocos',
      'Cogumelos',
      'Decoração',
      'Inimigos',
      'Itens',
      'Plataformas',
      'Portais',
      'Telas',
      'Terreno',
    ]);
    expect(EDITOR_CATEGORIES.every((category) => EDITOR_TABS.some((tab) => tab.id === category.id))).toBeTrue();
  });

  it('mostra as peças de cada aba em ordem alfabética, sem perder nenhuma', () => {
    for (const category of EDITOR_CATEGORIES) {
      const pieces = editorPiecesIn(category.id);

      expect(isAlphabetical(pieces.map((piece) => piece.label))).withContext(category.label).toBeTrue();
      expect(pieces.length).toBe(EDITOR_PIECES.filter((piece) => piece.category === category.id).length);
    }
  });

  it('lê os acentos e os números como gente: Água fica no A, e a moeda de 10 vem antes da de 100', () => {
    const terrain = editorPiecesIn('terreno').map((piece) => piece.label);
    const coins = editorPiecesIn('itens')
      .map((piece) => piece.label)
      .filter((label) => label.startsWith('Moeda Gigante '));

    expect(terrain.slice(0, 2)).toEqual(['Água', 'Areia']);
    expect(coins.indexOf('Moeda Gigante 10')).toBeLessThan(coins.indexOf('Moeda Gigante 100'));
    expect(sortByLabel([{ label: 'Zebra' }, { label: 'abelha' }]).map((item) => item.label)).toEqual(['abelha', 'Zebra']);
  });

  it('não mexe na peça padrão de cada tipo: a ordem da paleta é só da tela', () => {
    expect(findEditorPiece({ type: 'fire-bar' })?.id).toBe('fire-bar');
    expect(findEditorPiece({ type: 'surprise' })?.id).toBe('surprise-multi-coins');
    expect(EDITOR_PIECES[0].id).withContext('o editor começa pintando grama').toBe('ground');
  });
});

describe('Balões, o enfeite novo do Pedro Maker', () => {
  it('entra na aba Decoração e não atrapalha ninguém de passar', () => {
    const piece = EDITOR_PIECES.find((candidate) => candidate.type === 'balloons');

    expect(piece?.label).toBe('Balões');
    expect(piece?.category).toBe('decoracao');
    expect(OBJECT_BEHAVIOR.balloons).toEqual({ surface: 'none', isUnique: false });
    expect(editorPiecesIn('decoracao').map((candidate) => candidate.label).slice(0, 3)).toEqual(['Abóbora', 'Arbusto', 'Árvore']);
  });
});
