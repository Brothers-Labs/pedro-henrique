import {
  EDITOR_CATEGORIES,
  EDITOR_PIECES,
  EDITOR_TABS,
  editorPiecesIn,
  findEditorPiece,
  OBJECT_BEHAVIOR,
  RAINBOW_COLORS,
  type RainbowColor,
  sortByRainbow,
} from './object-catalog';

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

interface Colored {
  readonly label: string;
  readonly color: RainbowColor;
}

/** Do vermelho ao violeta, as sem cor no fim, e pela letra dentro da mesma cor. */
function isRainbowOrdered(items: readonly Colored[]): boolean {
  return items.every((item, index) => {
    if (index === 0) {
      return true;
    }

    const previous = items[index - 1];
    const colorStep = RAINBOW_COLORS.indexOf(item.color) - RAINBOW_COLORS.indexOf(previous.color);

    return colorStep > 0 || (colorStep === 0 && collator.compare(previous.label, item.label) <= 0);
  });
}

describe('Ordem de arco-íris do editor do Pedro Maker', () => {
  it('mostra as abas do vermelho ao violeta, com as sem cor e a aba Telas no fim', () => {
    expect(EDITOR_TABS.map((tab) => tab.label)).toEqual([
      'Cogumelos',
      'Blocos',
      'Terreno',
      'Itens',
      'Decoração',
      'Portais',
      'Plataformas',
      'Inimigos',
      'Bandeiras',
      'Telas',
    ]);
    expect(EDITOR_CATEGORIES.every((category) => EDITOR_TABS.some((tab) => tab.id === category.id))).toBeTrue();
  });

  it('mostra as peças de cada aba em ordem de arco-íris, sem perder nenhuma', () => {
    for (const category of EDITOR_CATEGORIES) {
      const pieces = editorPiecesIn(category.id);

      expect(isRainbowOrdered(pieces)).withContext(category.label).toBeTrue();
      expect(pieces.length).toBe(EDITOR_PIECES.filter((piece) => piece.category === category.id).length);
    }
  });

  it('abre cada aba pela cor mais quente que ela tem', () => {
    expect(editorPiecesIn('terreno').map((piece) => piece.label).slice(0, 3)).toEqual(['Bloco Arco-Íris', 'Lava', 'Madeira']);
    expect(editorPiecesIn('inimigos')[0].label).toBe('Peixe Saltador');
    expect(editorPiecesIn('cogumelos').map((piece) => piece.label).slice(0, 3)).toEqual(['Cogumelo Ímã', 'Giga Cogumelo', 'Super Cogumelo']);
    expect(editorPiecesIn('bandeiras').map((piece) => piece.label)).toEqual(['Checkpoint', 'Bandeira Final']);
  });

  it('ordena as moedas de multiplicação pela cor do ícone, do verde ao rosa', () => {
    const multipliers = editorPiecesIn('itens')
      .map((piece) => piece.label)
      .filter((label) => /^Moeda ×/.test(label));

    expect(multipliers).toEqual(['Moeda ×2', 'Moeda ×4', 'Moeda ×1000', 'Moeda ×9999']);
  });

  it('dentro da mesma cor lê os acentos e os números como gente', () => {
    const coins = editorPiecesIn('itens')
      .map((piece) => piece.label)
      .filter((label) => label.startsWith('Moeda Gigante '));

    expect(coins.indexOf('Moeda Gigante 10')).toBeLessThan(coins.indexOf('Moeda Gigante 100'));
    expect(
      sortByRainbow<Colored>([
        { label: 'Zebra', color: 'blue' },
        { label: 'abelha', color: 'blue' },
        { label: 'Água', color: 'red' },
        { label: 'Cinza', color: 'neutral' },
      ]).map((item) => item.label),
    ).toEqual(['Água', 'abelha', 'Zebra', 'Cinza']);
  });

  it('não mexe na peça padrão de cada tipo: a ordem da paleta é só da tela', () => {
    expect(findEditorPiece({ type: 'fire-bar' })?.id).toBe('fire-bar');
    expect(findEditorPiece({ type: 'surprise' })?.id).toBe('surprise-multi-coins');
    expect(EDITOR_PIECES[0].id).withContext('o editor começa pintando grama').toBe('ground');
  });
});

describe('Bloco Arco-Íris e Ponte Arco-Íris, as peças novas do Pedro Maker', () => {
  it('põe o bloco firme no Terreno e a ponte de mão única nas Plataformas', () => {
    expect(findEditorPiece({ type: 'rainbow-block' })).toEqual(jasmine.objectContaining({ category: 'terreno', label: 'Bloco Arco-Íris' }));
    expect(findEditorPiece({ type: 'rainbow-bridge' })).toEqual(jasmine.objectContaining({ category: 'plataformas', label: 'Ponte Arco-Íris' }));
    expect(OBJECT_BEHAVIOR['rainbow-block']).toEqual({ surface: 'solid', isUnique: false });
    expect(OBJECT_BEHAVIOR['rainbow-bridge']).toEqual({ surface: 'one-way', isUnique: false });
  });
});

describe('Balões, o enfeite novo do Pedro Maker', () => {
  it('entra na aba Decoração e não atrapalha ninguém de passar', () => {
    const piece = EDITOR_PIECES.find((candidate) => candidate.type === 'balloons');

    expect(piece?.label).toBe('Balões');
    expect(piece?.category).toBe('decoracao');
    expect(OBJECT_BEHAVIOR.balloons).toEqual({ surface: 'none', isUnique: false });
    expect(editorPiecesIn('decoracao').map((candidate) => candidate.label).slice(0, 3)).toEqual(['Cogumelinho', 'Abóbora', 'Barril']);
  });
});
