import type { CraftCatalog } from '../content/craft-catalog';
import { loadTestCatalog } from '../testing/craft-test-content';
import { creatureBoxes } from './creature-models';

describe('Modelos dos bonecos do PedroCraft', () => {
  const DOLLS = ['verity', 'lovity', 'falsity', 'cruelty'] as const;
  let catalog: CraftCatalog;

  beforeAll(async () => {
    catalog = await loadTestCatalog();
  });

  it('cada boneco tem os pés no chão e a cabeça perto da altura dele', () => {
    for (const id of DOLLS) {
      const boxes = creatureBoxes(catalog.creature(id), false);
      const lowest = Math.min(...boxes.map((part) => part.y - part.height / 2));
      const highest = Math.max(...boxes.map((part) => part.y + part.height / 2));

      expect(lowest).withContext(id).toBeCloseTo(0, 5);
      expect(highest).withContext(id).toBeGreaterThan(catalog.creature(id).height - 0.1);
    }
  });

  it('cada boneco ganha o enfeite com a cor dele: auréola, coração, máscara e chifres', () => {
    for (const id of DOLLS) {
      const definition = catalog.creature(id);
      const accessory = definition.colors[2];

      expect(creatureBoxes(definition, false).some((part) => part.color === accessory)).withContext(id).toBeTrue();
    }
  });
});
