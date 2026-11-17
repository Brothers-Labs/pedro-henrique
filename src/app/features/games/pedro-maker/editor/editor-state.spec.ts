import { analyzeReachability } from '../levels/level-reachability';
import { findStructuralProblems } from '../levels/level-validation';
import {
  DOOR_PAIR_COLORS,
  DOOR_PAIRS,
  doorPairColor,
  EDITOR_CATEGORIES,
  EDITOR_PIECES,
  EDITOR_POWER_UPS,
  findEditorPiece,
} from '../config/object-catalog';
import {
  cellsInRect,
  cellsOnLine,
  changeScreen,
  commit,
  createHistory,
  createStarterLevel,
  moveObject,
  objectAt,
  placeMany,
  placeObject,
  redo,
  removeMany,
  removeObjectAt,
  resizeLevel,
  undo,
  updatePropertiesAt,
  type EditorLevel,
} from './editor-state';

describe('Estado do editor de fases', () => {
  let counter: number;
  const nextId = (): string => {
    counter += 1;
    return `peca-${counter}`;
  };
  let starter: EditorLevel;

  beforeEach(() => {
    counter = 0;
    starter = createStarterLevel('Minha fase', 'vale', nextId);
  });

  it('cria uma fase inicial jogável e já completável', () => {
    const blueprint = { ...starter, id: 'x', targetTimeSeconds: 60 };

    expect(findStructuralProblems(blueprint)).toEqual([]);
    expect(analyzeReachability(blueprint).isPortalReachable).toBeTrue();
  });

  it('substitui a peça da célula ao colocar outra', () => {
    const placed = placeObject(starter, 'coin', 5, 5, nextId());
    const replaced = placeObject(placed, 'crystal', 5, 5, nextId());

    expect(objectAt(replaced, 5, 5)?.type).toBe('crystal');
    expect(replaced.objects.length).toBe(placed.objects.length);
  });

  it('mantém um único início, movendo o anterior', () => {
    const moved = placeObject(starter, 'start', 10, 11, nextId());

    expect(moved.objects.filter((object) => object.type === 'start').length).toBe(1);
    expect(objectAt(moved, 10, 11)?.type).toBe('start');
  });

  it('ignora peças fora da fase e repetições idênticas', () => {
    expect(placeObject(starter, 'coin', -1, 3, nextId())).toBe(starter);
    expect(placeObject(starter, 'coin', 5, 99, nextId())).toBe(starter);
    expect(placeObject(starter, 'ground', 0, 12, nextId())).toBe(starter);
  });

  it('apaga e move peças', () => {
    const withCoin = placeObject(starter, 'coin', 6, 6, nextId());
    const moved = moveObject(withCoin, 6, 6, 7, 6);

    expect(objectAt(moved, 6, 6)).toBeUndefined();
    expect(objectAt(moved, 7, 6)?.type).toBe('coin');
    expect(removeObjectAt(moved, 7, 6).objects.length).toBe(starter.objects.length);
    expect(removeObjectAt(starter, 20, 2)).toBe(starter);
  });

  it('desfaz e refaz na ordem certa', () => {
    const first = commit(createHistory(starter), placeObject(starter, 'coin', 4, 4, nextId()));
    const second = commit(first, placeObject(first.present, 'heart', 5, 4, nextId()));

    const undone = undo(second);
    expect(objectAt(undone.present, 5, 4)).toBeUndefined();
    expect(objectAt(undone.present, 4, 4)?.type).toBe('coin');

    const redone = redo(undone);
    expect(objectAt(redone.present, 5, 4)?.type).toBe('heart');

    expect(undo(createHistory(starter)).present).toBe(starter);
    expect(redo(createHistory(starter)).present).toBe(starter);
  });

  it('descarta o futuro ao editar depois de desfazer', () => {
    const edited = commit(createHistory(starter), placeObject(starter, 'coin', 4, 4, nextId()));
    const branched = commit(undo(edited), placeObject(starter, 'heart', 8, 4, nextId()));

    expect(branched.future).toEqual([]);
  });

  it('liga duas células com um traço sem buracos', () => {
    expect(cellsOnLine({ x: 0, y: 0 }, { x: 3, y: 0 })).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);

    const diagonal = cellsOnLine({ x: 5, y: 5 }, { x: 1, y: 2 });

    expect(diagonal[0]).toEqual({ x: 5, y: 5 });
    expect(diagonal.at(-1)).toEqual({ x: 1, y: 2 });
    expect(diagonal.length).toBe(5);
  });

  it('enche o retângulo entre dois cantos, em qualquer direção', () => {
    expect(cellsInRect({ x: 3, y: 2 }, { x: 1, y: 3 }).length).toBe(6);
  });

  it('coloca e apaga várias peças de uma vez', () => {
    const filled = placeMany(starter, 'brick', cellsInRect({ x: 10, y: 5 }, { x: 13, y: 6 }), nextId);

    expect(filled.objects.length).toBe(starter.objects.length + 8);
    expect(objectAt(filled, 13, 6)?.type).toBe('brick');
    expect(placeMany(filled, 'brick', [{ x: 10, y: 5 }], nextId)).toBe(filled);

    const cleared = removeMany(filled, cellsInRect({ x: 10, y: 5 }, { x: 13, y: 6 }));

    expect(cleared.objects.length).toBe(starter.objects.length);
    expect(removeMany(cleared, [{ x: 30, y: 2 }])).toBe(cleared);
  });

  it('num traço de peça única, fica só a última célula', () => {
    const moved = placeMany(starter, 'portal', cellsOnLine({ x: 20, y: 11 }, { x: 25, y: 11 }), nextId);

    expect(moved.objects.filter((object) => object.type === 'portal').length).toBe(1);
    expect(objectAt(moved, 25, 11)?.type).toBe('portal');
  });

  it('muda as propriedades da peça sem trocar de lugar', () => {
    const withSign = placeObject(starter, 'sign', 6, 11, nextId(), { text: 'Oi' });
    const renamed = updatePropertiesAt(withSign, 6, 11, { text: 'Tchau' });

    expect(objectAt(renamed, 6, 11)?.properties?.text).toBe('Tchau');
    expect(updatePropertiesAt(renamed, 6, 11, { text: 'Tchau' })).toBe(renamed);
    expect(updatePropertiesAt(renamed, 40, 2, { text: 'x' })).toBe(renamed);
  });

  it('reconhece a peça da paleta pelo tipo e pelas propriedades', () => {
    expect(findEditorPiece({ type: 'door', properties: { pair: 'B' } })?.id).toBe('door-b');
    expect(findEditorPiece({ type: 'surprise', properties: { contents: 'heart' } })?.id).toBe('surprise-heart');
    expect(findEditorPiece({ type: 'ground' })?.id).toBe('ground');
    expect(findEditorPiece({ type: 'portal' })?.id).toBe('portal');
    expect(findEditorPiece({ type: 'portal', properties: { portalLook: 'castle' } })?.id).toBe('portal-castle');
    expect(findEditorPiece({ type: 'invisible-grass' })?.id).toBe('invisible-grass');
    expect(findEditorPiece({ type: 'skeleton-platform' })?.id).toBe('skeleton-platform');
    expect(findEditorPiece({ type: 'ceiling-spring' })?.id).toBe('ceiling-spring');
    expect(findEditorPiece({ type: 'king-cactus' })?.id).toBe('king-cactus');
    expect(findEditorPiece({ type: 'living-pumpkin' })?.id).toBe('living-pumpkin');
    expect(findEditorPiece({ type: 'witch' })?.id).toBe('witch');
    expect(findEditorPiece({ type: 'pumpkin' })?.id).toBe('pumpkin');
    expect(findEditorPiece({ type: 'power-up', properties: { powerUp: 'turbo-mushroom' } })?.id).toBe('power-turbo-mushroom');
    expect(findEditorPiece({ type: 'power-up', properties: { powerUp: 'magnet-mushroom' } })?.id).toBe('power-magnet-mushroom');
    expect(findEditorPiece({ type: 'power-up', properties: { powerUp: 'tall-mushroom' } })?.id).toBe('power-tall-mushroom');
    expect(findEditorPiece({ type: 'power-up', properties: { powerUp: 'reverse-mushroom' } })?.id).toBe('power-reverse-mushroom');
    expect(findEditorPiece({ type: 'power-up', properties: { powerUp: 'mini-mushroom' } })?.id).toBe('power-mini-mushroom');
  });

  it('a aba Telas escolhe a tela da fase, e "quem joga escolhe" tira a escolha', () => {
    const nes = changeScreen(starter, 'nes');

    expect(nes.screen).toBe('nes');
    expect(changeScreen(nes, 'nes')).withContext('mesma tela: nada muda').toBe(nes);
    expect('screen' in changeScreen(nes, null)).toBeFalse();
    expect(changeScreen(starter, null)).toBe(starter);

    const history = commit(createHistory(starter), nes);

    expect(undo(history).present.screen).withContext('dá para desfazer').toBeUndefined();
  });

  it('tem os canos mágicos de A a F, a Flor Falante com frase e os dois bastões de fogo', () => {
    const pipes = EDITOR_PIECES.filter((piece) => piece.type === 'warp-pipe');

    expect(pipes.map((piece) => piece.properties?.pair)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(pipes.every((piece) => piece.category === 'portais' && piece.label.startsWith('Cano '))).toBeTrue();
    expect(EDITOR_PIECES.find((piece) => piece.type === 'talking-flower')?.properties?.text).toBeTruthy();
    expect(findEditorPiece({ type: 'fire-bar', properties: { range: 4 } })?.label).toBe('Bastão de Fogo');
    expect(findEditorPiece({ type: 'fire-bar', properties: { range: 6 } })?.label).toBe('Bastão de Fogo Comprido');
    expect(findEditorPiece({ type: 'p-switch' })).toEqual(jasmine.objectContaining({ category: 'blocos', label: 'Botão P' }));
  });

  it('tem as portas de madeira de A a F e a dourada num par só dela', () => {
    for (const pair of ['A', 'B', 'C', 'D', 'E', 'F']) {
      const piece = findEditorPiece({ type: 'door', properties: { pair } });

      expect(piece?.id).withContext(pair).toBe(`door-${pair.toLowerCase()}`);
      expect(piece?.label).toBe(`Porta ${pair}`);
    }

    const golden = EDITOR_PIECES.find((piece) => piece.id === 'door-golden');
    const woodenPairs = EDITOR_PIECES.filter((piece) => piece.type === 'door').map((piece) => piece.properties?.pair);

    expect(golden?.properties?.pair).toBe('G');
    expect(woodenPairs).not.toContain('G');
    expect(DOOR_PAIRS).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });

  it('dá uma cor diferente a cada letra de porta', () => {
    const colors = DOOR_PAIRS.map((pair) => DOOR_PAIR_COLORS[pair]);

    expect(new Set(colors).size).toBe(DOOR_PAIRS.length);
    expect(doorPairColor('C')).toBe(DOOR_PAIR_COLORS.C);
    expect(doorPairColor('oasis')).toBe('#2a2350');
  });

  it('não tem mais a categoria Power-ups, mas guarda os cogumelos', () => {
    expect(EDITOR_CATEGORIES.map((category) => category.label)).not.toContain('Power-ups');
    expect(EDITOR_PIECES.some((piece) => piece.properties?.powerUp === 'super-jump')).toBeFalse();
    expect(EDITOR_POWER_UPS).not.toContain('super-jump');
    expect(EDITOR_POWER_UPS).not.toContain('shield');
    expect(EDITOR_POWER_UPS).toContain('mushroom');
    expect(EDITOR_POWER_UPS).toContain('swap-mushroom');
    expect(EDITOR_POWER_UPS).toContain('magnet-mushroom');
    expect(EDITOR_POWER_UPS).toContain('tall-mushroom');
    expect(EDITOR_POWER_UPS).toContain('reverse-mushroom');
    expect(EDITOR_POWER_UPS).toContain('mini-mushroom');
    expect(EDITOR_POWER_UPS).toContain('pedrere-mushroom');
    for (const kind of ['coin-x2', 'coin-x4', 'coin-x1000', 'coin-x9999'] as const) {
      expect(EDITOR_POWER_UPS).toContain(kind);
      expect(findEditorPiece({ type: 'power-up', properties: { powerUp: kind } })?.category).withContext('fica com as moedas').toBe('itens');
    }
    // Toda categoria que sobrou tem peça.
    expect(EDITOR_CATEGORIES.every((category) => EDITOR_PIECES.some((piece) => piece.category === category.id))).toBeTrue();
  });

  it('corta o que sobra ao diminuir a fase e respeita os limites de largura', () => {
    const narrow = resizeLevel(starter, 40);

    expect(narrow.width).toBe(40);
    expect(narrow.objects.every((object) => object.x < 40)).toBeTrue();
    expect(resizeLevel(starter, 5).width).toBe(30);
    expect(resizeLevel(starter, 9999).width).toBe(400);
  });
});
