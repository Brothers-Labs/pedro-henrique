import type { CraftCatalog } from '../content/craft-catalog';
import { loadTestCatalog } from '../testing/craft-test-content';
import { creatureBoxes } from './creature-models';

describe('Modelos dos bonecos do PedroCraft', () => {
  const DOLLS = ['verity', 'falsity', 'cruelty', 'lovity', 'obesity', 'squareity', 'pointy'] as const;
  let catalog: CraftCatalog;

  beforeAll(async () => {
    catalog = await loadTestCatalog();
  });

  it('cada boneco tem os pés no chão e o topo perto da altura dele', () => {
    for (const id of DOLLS) {
      const boxes = creatureBoxes(catalog.creature(id), false);
      const lowest = Math.min(...boxes.map((part) => part.y - part.height / 2));
      const highest = Math.max(...boxes.map((part) => part.y + part.height / 2));

      expect(lowest).withContext(id).toBeCloseTo(0, 5);
      expect(highest).withContext(id).toBeGreaterThan(catalog.creature(id).height - 0.1);
    }
  });

  it('cada boneco usa todas as cores dele: corpo, cara e enfeite', () => {
    for (const id of DOLLS) {
      const definition = catalog.creature(id);
      const painted = new Set(creatureBoxes(definition, false).map((part) => part.color));

      expect(definition.colors.filter((color) => !painted.has(color))).withContext(id).toEqual([]);
    }
  });

  it('os bonecos do desenho do Pedro são bolinhas nas cores do desenho', () => {
    const bodies = ['verity', 'falsity', 'cruelty', 'lovity'].map((id) => catalog.creature(id).colors[0]);

    expect(bodies).toEqual(['#ffc23a', '#3356ff', '#ff3333', '#ff3cf5']);
  });

  it('o Obesity segura um hambúrguer do lado de fora do corpo', () => {
    const definition = catalog.creature('obesity');
    const bun = definition.colors[1];
    const buns = creatureBoxes(definition, false).filter((part) => part.color === bun);

    expect(buns.length).toBeGreaterThan(0);
    expect(buns.every((part) => part.x > definition.width / 2)).toBeTrue();
  });
});
