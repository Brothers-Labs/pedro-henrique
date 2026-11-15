import { HEROES } from '../../pedro-maker/config/hero.config';
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

  it('os bonecos do Pedro Maker ficam de pé no chão, na altura do creatures.json, sem passar do espaço de um bloco', () => {
    for (const hero of HEROES) {
      const definition = catalog.creature(`boneco-${hero.id}`);
      const boxes = creatureBoxes(definition, false);
      const lowest = Math.min(...boxes.map((part) => part.y - part.height / 2));
      const highest = Math.max(...boxes.map((part) => part.y + part.height / 2));
      const frontmost = Math.min(...boxes.map((part) => part.z - part.depth / 2));
      const backmost = Math.max(...boxes.map((part) => part.z + part.depth / 2));

      expect(lowest).withContext(hero.id).toBeCloseTo(0, 5);
      expect(highest).withContext(hero.id).toBeCloseTo(definition.height, 5);
      expect(Math.abs(frontmost)).withContext(hero.id).toBeLessThan(0.6);
      expect(backmost).withContext(hero.id).toBeLessThan(0.6);
    }
  });

  it('cada boneco do Maker é diferente dos outros', () => {
    const looks = HEROES.map((hero) => JSON.stringify(creatureBoxes(catalog.creature(`boneco-${hero.id}`), false)));

    expect(new Set(looks).size).toBe(HEROES.length);
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
