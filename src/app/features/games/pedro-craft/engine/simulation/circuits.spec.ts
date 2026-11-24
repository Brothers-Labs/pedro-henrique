import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { VoxelWorld } from '../../world/voxel-world';
import { BlockProperties } from '../block-properties';
import { BlockActions } from './block-actions';
import { Circuits } from './circuits';
import { ItemDrops } from './item-drops';

/** Chão de pedra em y = 0: tudo do circuito fica em y = 1. */
const FLOOR = 1;

describe('Circuitos do PedroCraft: alavanca, linha, porta e TNT', () => {
  let catalog: CraftCatalog;
  let world: VoxelWorld;
  let actions: BlockActions;
  let circuits: Circuits;
  let ignited: string[];

  beforeAll(async () => {
    catalog = await loadTestCatalog();
  });

  beforeEach(() => {
    // Largura, profundidade e altura.
    world = new VoxelWorld(12, 12, 6);
    ignited = [];

    for (let z = 0; z < 12; z += 1) {
      for (let x = 0; x < 12; x += 1) {
        world.fill(x, 0, z, catalog.blockNumber('stone'));
      }
    }

    actions = new BlockActions({
      catalog,
      world,
      properties: new BlockProperties(catalog),
      drops: new ItemDrops(),
      random: () => 0,
      visual: () => undefined,
      placed: () => undefined,
      removed: () => undefined,
      harvest: () => null,
      bodies: () => [],
    });
    circuits = new Circuits({
      catalog,
      world,
      switchInto: (x, y, z, blockId) => actions.switchInto(x, y, z, blockId),
      ignite: (x, y, z) => ignited.push(`${x},${y},${z}`),
    });
  });

  const at = (x: number, y: number, z: number): string => catalog.blockAt(world.get(x, y, z))?.id ?? 'air';

  /** Coloca como o herói colocaria: o bloco entra no mundo e o circuito fica sabendo. */
  const place = (id: string, x: number, y: number = FLOOR, z: number = 5): void => {
    const block = catalog.block(id);

    world.set(x, y, z, catalog.blockNumber(id));

    if (block.pairsVertically) {
      world.set(x, y + 1, z, catalog.blockNumber(id));
    }

    circuits.placed(block, x, y, z);
  };

  const remove = (x: number, y: number = FLOOR, z: number = 5): void => {
    const block = catalog.blockAt(world.get(x, y, z));

    world.set(x, y, z, AIR);

    if (block) {
      circuits.removed(block, x, y, z);
    }
  };

  /** O herói usa a alavanca. */
  const flip = (x: number, y: number = FLOOR, z: number = 5): void => {
    actions.toggle(x, y, z);
    circuits.toggled(x, y, z);
  };

  /** Alavanca em x = 1, linha de x = 2 a x = 4 e a porta em x = 5. */
  const buildDoorCircuit = (): void => {
    place('lever', 1);

    for (const x of [2, 3, 4]) {
      place('string-line', x);
    }

    place('door', 5);
  };

  it('a alavanca ligada acende a linha toda e abre as duas metades da porta; desligada, fecha', () => {
    buildDoorCircuit();

    expect([at(2, FLOOR, 5), at(5, FLOOR, 5)]).toEqual(['string-line', 'door']);

    flip(1);

    expect([2, 3, 4].map((x) => at(x, FLOOR, 5))).toEqual(['string-line-on', 'string-line-on', 'string-line-on']);
    expect([at(5, FLOOR, 5), at(5, FLOOR + 1, 5)]).toEqual(['door-open', 'door-open']);

    flip(1);

    expect([2, 3, 4].map((x) => at(x, FLOOR, 5))).toEqual(['string-line', 'string-line', 'string-line']);
    expect([at(5, FLOOR, 5), at(5, FLOOR + 1, 5)]).toEqual(['door', 'door']);
  });

  it('a linha colocada depois, saindo de uma alavanca ligada, já chega acesa', () => {
    place('lever', 1);
    flip(1);
    place('door', 4);
    place('string-line', 2);

    expect(at(2, FLOOR, 5)).toBe('string-line-on');
    expect(at(4, FLOOR, 5)).withContext('ainda falta um pedaço de linha').toBe('door');

    place('string-line', 3);

    expect(at(3, FLOOR, 5)).toBe('string-line-on');
    expect(at(4, FLOOR, 5)).toBe('door-open');
  });

  it('quebrar a linha no meio apaga o resto e fecha a porta', () => {
    buildDoorCircuit();
    flip(1);
    remove(3);

    expect(at(2, FLOOR, 5)).withContext('o pedaço da alavanca continua aceso').toBe('string-line-on');
    expect(at(4, FLOOR, 5)).toBe('string-line');
    expect(at(5, FLOOR, 5)).toBe('door');
  });

  it('quebrar a alavanca ligada desliga tudo', () => {
    buildDoorCircuit();
    flip(1);
    remove(1);

    expect(at(2, FLOOR, 5)).toBe('string-line');
    expect(at(5, FLOOR, 5)).toBe('door');
  });

  it('a alavanca encostada direto na porta também abre, sem linha', () => {
    place('lever', 1);
    place('door', 2);
    flip(1);

    expect(at(2, FLOOR, 5)).toBe('door-open');
  });

  it('com duas alavancas na mesma linha, desligar uma não apaga a linha enquanto a outra está ligada', () => {
    buildDoorCircuit();
    place('lever', 3, FLOOR, 6);
    flip(1);
    flip(3, FLOOR, 6);
    flip(1);

    expect(at(1, FLOOR, 5)).toBe('lever');
    expect(at(3, FLOOR, 6)).toBe('lever-on');
    expect(at(3, FLOOR, 5)).toBe('string-line-on');
    expect(at(5, FLOOR, 5)).toBe('door-open');
  });

  it('a porta aberta com a mão continua aberta: só a alavanca muda o circuito', () => {
    buildDoorCircuit();
    flip(5);

    expect(at(5, FLOOR, 5)).toBe('door-open');
  });

  it('a porta colocada encostada numa linha acesa já abre', () => {
    place('lever', 1);
    place('string-line', 2);
    flip(1);
    place('door', 3);

    expect(at(3, FLOOR, 5)).toBe('door-open');
  });

  it('acende a TNT na ponta da linha', () => {
    place('lever', 1);
    place('string-line', 2);
    place('tnt', 3);

    expect(ignited).withContext('com a alavanca desligada, nada acende').toEqual([]);

    flip(1);

    expect(ignited).toEqual([`3,${FLOOR},5`]);
  });

  it('acende a TNT que tem a linha colocada em cima dela', () => {
    world.set(1, FLOOR, 5, catalog.blockNumber('stone'));
    place('lever', 1, FLOOR + 1);
    place('tnt', 2);
    place('string-line', 2, FLOOR + 1);
    flip(1, FLOOR + 1);

    // A alavanca, em cima da pedra, não encosta na TNT: o comando chega pela linha de cima.
    expect(ignited).toEqual([`2,${FLOOR},5`]);
  });

  it('a linha sobe a parede: a alavanca no chão acende a linha da parede e abre a porta lá em cima', () => {
    // Paredão de pedra em x = 5; a porta fica num degrau de pedra do outro lado da linha, em y = 4 e 5.
    for (const y of [1, 2, 3, 4]) {
      world.set(5, y, 5, catalog.blockNumber('stone'));
    }

    place('lever', 3);
    place('string-line', 4);

    for (const y of [2, 3, 4]) {
      place('string-line-wall-east', 4, y);
    }

    place('door', 3, 4);
    world.set(3, 3, 5, catalog.blockNumber('stone'));

    flip(3);

    expect([at(4, 1, 5), at(4, 2, 5), at(4, 3, 5), at(4, 4, 5)]).toEqual([
      'string-line-on',
      'string-line-wall-east-on',
      'string-line-wall-east-on',
      'string-line-wall-east-on',
    ]);
    expect(at(3, 4, 5)).toBe('door-open');

    flip(3);

    expect(at(4, 4, 5)).toBe('string-line-wall-east');
    expect(at(3, 4, 5)).toBe('door');
  });

  it('a lâmpada encostada na linha acende com a alavanca e apaga quando ela desliga', () => {
    place('lever', 1);
    place('string-line', 2);
    place('lamp', 3);

    flip(1);

    expect(at(3, FLOOR, 5)).toBe('lamp-on');

    flip(1);

    expect(at(3, FLOOR, 5)).toBe('lamp');
  });

  it('a lâmpada colocada encostada numa linha acesa já acende, e apaga quando a linha sai', () => {
    place('lever-on', 1);
    place('string-line', 2);
    place('lamp', 3);

    expect(at(3, FLOOR, 5)).toBe('lamp-on');

    remove(2);

    expect(at(3, FLOOR, 5)).toBe('lamp');
  });

  it('a linha não atravessa um bloco comum: a porta do outro lado não abre', () => {
    place('lever', 1);
    place('string-line', 2);
    world.set(3, FLOOR, 5, catalog.blockNumber('stone'));
    place('door', 4);
    flip(1);

    expect(at(4, FLOOR, 5)).toBe('door');
  });
});
