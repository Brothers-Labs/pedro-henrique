import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { VoxelWorld } from '../../world/voxel-world';
import { BlockProperties } from '../block-properties';
import { BlockActions, blastDropChance } from './block-actions';
import { ItemDrops } from './item-drops';
import { PhysicsBody } from './physics-body';
import type { RayHit } from './raycast';

describe('Ações nos blocos do PedroCraft', () => {
  let catalog: CraftCatalog;
  let world: VoxelWorld;
  let drops: ItemDrops;
  let actions: BlockActions;
  let placed: string[];
  let removed: string[];
  let bodies: PhysicsBody[];

  beforeAll(async () => {
    catalog = await loadTestCatalog();
  });

  beforeEach(() => {
    world = new VoxelWorld(8, 8, 8);
    drops = new ItemDrops();
    placed = [];
    removed = [];
    bodies = [];

    for (let z = 0; z < 8; z += 1) {
      for (let x = 0; x < 8; x += 1) {
        world.fill(x, 0, z, catalog.blockNumber('stone'));
      }
    }

    actions = new BlockActions({
      catalog,
      world,
      properties: new BlockProperties(catalog),
      drops,
      random: () => 0,
      visual: () => undefined,
      placed: (block) => placed.push(block.id),
      removed: (_x, _y, _z, block) => removed.push(block.id),
      harvest: () => null,
      bodies: () => bodies,
    });
  });

  const put = (id: string, x: number, y: number, z: number): void => world.fill(x, y, z, catalog.blockNumber(id));
  const at = (x: number, y: number, z: number): string => catalog.blockAt(world.get(x, y, z))?.id ?? 'air';
  const aimAt = (x: number, y: number, z: number, normal: { readonly x: number; readonly y: number; readonly z: number }): RayHit => ({
    x,
    y,
    z,
    normalX: normal.x,
    normalY: normal.y,
    normalZ: normal.z,
    distance: 1,
  });
  const FROM_ABOVE = { x: 0, y: 1, z: 0 } as const;
  const FROM_WEST = { x: -1, y: 0, z: 0 } as const;

  describe('meio bloco', () => {
    for (const material of ['gold', 'diamond', 'emerald', 'netherite'] as const) {
      it(`o meio bloco de ${material} colocado no alto de outro igual fecha os dois num bloco inteiro`, () => {
        put(`${material}-half`, 3, 1, 3);

        expect(actions.placeBlock(aimAt(3, 1, 3, FROM_ABOVE), catalog.block(`${material}-half`))).toBeTrue();
        expect(at(3, 1, 3)).toBe(`${material}-block`);
        expect(at(3, 2, 3)).withContext('não sobra meio bloco em cima').toBe('air');
        expect(placed).toEqual([`${material}-half`]);
      });
    }

    it('em cima de um meio bloco diferente, o novo fica na célula de cima', () => {
      put('gold-half', 3, 1, 3);

      expect(actions.placeBlock(aimAt(3, 1, 3, FROM_ABOVE), catalog.block('diamond-half'))).toBeTrue();
      expect(at(3, 1, 3)).toBe('gold-half');
      expect(at(3, 2, 3)).toBe('diamond-half');
    });

    it('mirando a lateral do meio bloco, o novo fica ao lado, sem empilhar', () => {
      put('gold-half', 3, 1, 3);

      expect(actions.placeBlock(aimAt(3, 1, 3, FROM_WEST), catalog.block('gold-half'))).toBeTrue();
      expect(at(3, 1, 3)).toBe('gold-half');
      expect(at(2, 1, 3)).toBe('gold-half');
    });

    it('não empilha com alguém em pé no meio bloco: ele ficaria preso dentro do bloco inteiro', () => {
      put('gold-half', 3, 1, 3);
      bodies = [new PhysicsBody(3.5, 1.5, 3.5, 0.3, 1.8)];

      expect(actions.placeBlock(aimAt(3, 1, 3, FROM_ABOVE), catalog.block('gold-half'))).toBeFalse();
      expect(at(3, 1, 3)).toBe('gold-half');
      expect(placed).toEqual([]);
    });
  });

  describe('linha e alavanca', () => {
    it('a linha só fica em cima de chão firme', () => {
      expect(actions.placeBlock(aimAt(3, 0, 3, FROM_ABOVE), catalog.block('string-line'))).toBeTrue();
      expect(at(3, 1, 3)).toBe('string-line');

      put('glass', 5, 1, 5);

      expect(actions.placeBlock(aimAt(5, 1, 5, FROM_ABOVE), catalog.block('string-line'))).withContext('o vidro não segura').toBeFalse();
    });

    it('a linha que fica sem chão cai junto, avisa que saiu e devolve a linha', () => {
      put('dirt', 3, 1, 3);
      put('string-line-on', 3, 2, 3);

      actions.breakBlock(3, 1, 3, null);

      expect(at(3, 2, 3)).toBe('air');
      expect(removed).toEqual(['dirt', 'string-line-on']);
      expect(drops.list.map((drop) => drop.stack.item)).toContain('string');
    });

    it('a alavanca liga e desliga como a porta', () => {
      put('lever', 3, 1, 3);

      expect(actions.toggle(3, 1, 3)).toBeTrue();
      expect(at(3, 1, 3)).toBe('lever-on');
      expect(actions.toggle(3, 1, 3)).toBeTrue();
      expect(at(3, 1, 3)).toBe('lever');
    });

    it('troca as duas metades da porta juntas, e só elas', () => {
      put('door', 3, 1, 3);
      put('door', 3, 2, 3);
      put('stone', 3, 3, 3);

      actions.switchInto(3, 1, 3, 'door-open');

      expect([at(3, 1, 3), at(3, 2, 3), at(3, 3, 3)]).toEqual(['door-open', 'door-open', 'stone']);
      expect(world.get(3, 4, 3)).toBe(AIR);
    });
  });

  describe('explosão', () => {
    it('a explosão pequena solta itens com a chance de sempre; a gigante, cada vez menos, pelo volume', () => {
      expect(blastDropChance(3)).toBe(blastDropChance(5));
      expect(blastDropChance(10)).toBeCloseTo(blastDropChance(5) / 8, 10);
      expect(blastDropChance(30)).toBeGreaterThan(0);
    });

    it('a bomba nuclear abre a cratera inteira, mas solta só os itens de uma explosão pequena', () => {
      const big = new VoxelWorld(64, 64, 40);
      const bigDrops = new ItemDrops();
      // Terra solta item sem ferramenta; a pedra pediria a picareta.
      const dirt = catalog.blockNumber('dirt');
      const radius = catalog.block('nuclear-bomb').explosive?.radius ?? 0;
      let seed = 7;
      const blaster = new BlockActions({
        catalog,
        world: big,
        properties: new BlockProperties(catalog),
        drops: bigDrops,
        random: () => {
          seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
          return seed / 4294967296;
        },
        visual: () => undefined,
        placed: () => undefined,
        removed: () => undefined,
        harvest: () => null,
        bodies: () => [],
      });

      for (let y = 0; y < big.height; y += 1) {
        for (let z = 0; z < big.depth; z += 1) {
          for (let x = 0; x < big.width; x += 1) {
            big.fill(x, y, z, dirt);
          }
        }
      }

      blaster.blast(32, 20, 32, radius, () => undefined);

      expect(big.get(32 + radius - 1, 20, 32)).withContext('perto da borda da cratera').toBe(AIR);
      expect(big.get(32 + radius + 1, 20, 32)).withContext('logo depois da borda').toBe(dirt);
      expect(bigDrops.list.length).toBeGreaterThan(0);
      expect(bigDrops.list.length).toBeLessThan(Math.ceil(blastDropChance(5) * (4 / 3) * Math.PI * 5 ** 3 * 1.5));
    });
  });
});
