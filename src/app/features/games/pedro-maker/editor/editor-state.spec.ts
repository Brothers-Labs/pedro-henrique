import { analyzeReachability } from '../levels/level-reachability';
import { findStructuralProblems } from '../levels/level-validation';
import {
  commit,
  createHistory,
  createStarterLevel,
  moveObject,
  objectAt,
  placeObject,
  redo,
  removeObjectAt,
  resizeLevel,
  undo,
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

  it('corta o que sobra ao diminuir a fase e respeita os limites de largura', () => {
    const narrow = resizeLevel(starter, 40);

    expect(narrow.width).toBe(40);
    expect(narrow.objects.every((object) => object.x < 40)).toBeTrue();
    expect(resizeLevel(starter, 5).width).toBe(30);
    expect(resizeLevel(starter, 9999).width).toBe(400);
  });
});
