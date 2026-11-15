import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import { loadTestCatalog } from '../../testing/craft-test-content';
import { VoxelWorld } from '../../world/voxel-world';
import { type CraftInputSnapshot, IDLE_CRAFT_INPUT } from '../input/craft-input';
import { CraftSimulation } from './craft-simulation';
import type { Creature } from './creatures';
import { goalIcon, hudState as hudOf } from '../session-views';
import type { SimulationEvent } from './simulation-events';

/** Olhando para +x, na altura dos olhos: a mira cai no bloco (7, 4, 5). */
const FACING_EAST = -Math.PI / 2;
const FLOOR_TOP = 3;
const TARGET = { x: 7, y: 4, z: 5 } as const;

describe('Simulação do PedroCraft: colher e construir', () => {
  let catalog: CraftCatalog;
  let world: VoxelWorld;
  let simulation: CraftSimulation;
  let events: SimulationEvent[];

  beforeAll(async () => {
    catalog = await loadTestCatalog();
  });

  beforeEach(() => {
    world = new VoxelWorld(16, 16, 16);

    for (let y = 0; y < FLOOR_TOP; y += 1) {
      for (let z = 0; z < 16; z += 1) {
        for (let x = 0; x < 16; x += 1) {
          world.fill(x, y, z, catalog.blockNumber(y === FLOOR_TOP - 1 ? 'grass' : 'stone'));
        }
      }
    }

    simulation = new CraftSimulation({
      catalog,
      world,
      spawn: { x: 5.5, y: FLOOR_TOP, z: 5.5, yaw: FACING_EAST },
      autoJump: false,
      randomSeed: 1,
      inventory: [],
    });
    events = [];
  });

  const put = (id: string, x: number = TARGET.x, y: number = TARGET.y, z: number = TARGET.z): void =>
    world.fill(x, y, z, catalog.blockNumber(id));

  const run = (steps: number, input: Partial<CraftInputSnapshot> = {}): void => {
    for (let step = 0; step < steps; step += 1) {
      simulation.step({ ...IDLE_CRAFT_INPUT, ...input });
      events.push(...simulation.drainEvents());
    }
  };

  const hold = (id: string, durability: number | null = null): void => {
    simulation.inventory.slots[0] = { item: id, count: 1, durability: durability ?? catalog.item(id).durability };
  };

  it('mira o bloco à frente', () => {
    put('oak-log');
    run(1);

    expect(simulation.target).toEqual(jasmine.objectContaining(TARGET));
  });

  it('quebra o tronco segurando o botão, e o tronco voa para a mochila', () => {
    put('oak-log');
    run(200, { primaryHeld: true });

    expect(world.get(TARGET.x, TARGET.y, TARGET.z)).toBe(AIR);
    expect(simulation.inventory.count('oak-log')).toBe(1);
    expect(events).toContain({ type: 'pickup', item: 'oak-log', count: 1 });
  });

  it('não quebra se o botão for solto antes do tempo', () => {
    put('oak-log');
    run(30, { primaryHeld: true });
    run(1);

    expect(world.get(TARGET.x, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('oak-log'));
    expect(simulation.mining).toBeNull();
  });

  it('avança a missão de pegar troncos', () => {
    put('oak-log');
    run(200, { primaryHeld: true });

    expect(simulation.goals.progress).toEqual({ index: 0, amount: 1 });
  });

  it('quebra a pedra sem picareta, mas não dá item e explica o porquê', () => {
    put('stone');
    run(400, { primaryHeld: true });

    expect(world.get(TARGET.x, TARGET.y, TARGET.z)).toBe(AIR);
    expect(simulation.drops.list.length).toBe(0);
    expect(simulation.inventory.count('cobblestone')).toBe(0);
    expect(events.filter((event) => event.type === 'hint').length).toBe(1);
  });

  it('dá pedregulho com picareta e gasta um uso dela', () => {
    put('stone');
    hold('wooden-pickaxe');
    run(200, { primaryHeld: true });

    expect(simulation.inventory.count('cobblestone')).toBe(1);
    expect(simulation.inventory.slots[0]?.durability).toBe(59);
  });

  it('avisa quando a ferramenta quebra', () => {
    put('dirt');
    hold('wooden-shovel', 1);
    run(200, { primaryHeld: true });

    expect(simulation.inventory.slots[0]?.item).not.toBe('wooden-shovel');
    expect(events).toContain({ type: 'tool-broke', item: 'wooden-shovel' });
  });

  it('coloca o bloco da mão na face mirada e gasta um da pilha', () => {
    put('stone');
    simulation.inventory.slots[0] = { item: 'oak-planks', count: 5, durability: null };
    run(1, { secondaryPressed: true });

    expect(world.get(TARGET.x - 1, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('oak-planks'));
    expect(simulation.inventory.slots[0]?.count).toBe(4);
  });

  it('não coloca bloco dentro do próprio herói', () => {
    put('stone', 6, 2, 5);
    world.fill(6, 3, 5, AIR);
    simulation.hero.look(0, -Math.PI / 2);
    simulation.inventory.slots[0] = { item: 'oak-planks', count: 5, durability: null };
    simulation.hero.teleport(6.5, FLOOR_TOP, 5.5);
    run(1, { secondaryPressed: true });

    expect(simulation.inventory.slots[0]?.count).toBe(5);
  });

  it('coloca o bloco no lugar do capim, que é substituível', () => {
    put('tall-grass');
    simulation.inventory.slots[0] = { item: 'oak-planks', count: 1, durability: null };
    run(1, { secondaryPressed: true });

    expect(world.get(TARGET.x, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('oak-planks'));
  });

  it('abre e fecha as duas metades da porta', () => {
    put('door', TARGET.x, 3);
    put('door', TARGET.x, 4);
    run(1, { secondaryPressed: true });

    expect(world.get(TARGET.x, 3, TARGET.z)).toBe(catalog.blockNumber('door-open'));
    expect(world.get(TARGET.x, 4, TARGET.z)).toBe(catalog.blockNumber('door-open'));
  });

  it('derruba a tocha quando o chão dela é quebrado', () => {
    world.fill(TARGET.x, 3, TARGET.z, catalog.blockNumber('dirt'));
    put('torch', TARGET.x, 4);
    simulation.hero.look(0, -0.5);
    run(1);

    expect(simulation.target).toEqual(jasmine.objectContaining({ x: TARGET.x, y: 3 }));

    run(200, { primaryHeld: true });

    expect(world.get(TARGET.x, 4, TARGET.z)).toBe(AIR);
    expect(simulation.inventory.count('torch')).toBe(1);
  });

  it('pede a mochila pela tecla e muda o item escolhido pelo número', () => {
    run(1, { inventoryPressed: true, hotbarSlot: 4 });

    expect(events).toContain({ type: 'open-screen', screen: 'inventory' });
    expect(simulation.selectedSlot).toBe(4);
  });

  it('dá a mochila inicial do mundo a quem começa sem inventário guardado', () => {
    const fresh = new CraftSimulation({
      catalog,
      world,
      spawn: { x: 5.5, y: FLOOR_TOP, z: 5.5, yaw: 0 },
      autoJump: false,
      randomSeed: 1,
    });

    for (const entry of catalog.world.hero.startingInventory) {
      expect(fresh.inventory.count(entry.item)).toBe(entry.count);
    }
  });

  describe('trilhos e trem', () => {
    /** Uma linha reta de trilhos para o leste, começando na mira, com pedra embaixo. */
    const layTrack = (length: number): void => {
      for (let x = TARGET.x; x < TARGET.x + length; x += 1) {
        put('stone', x, TARGET.y - 1);
        put('rail', x);
      }
    };

    it('o trilho só fica em cima de chão firme', () => {
      put('stone');
      simulation.inventory.slots[0] = { item: 'rail', count: 4, durability: null };
      run(1, { secondaryPressed: true });

      expect(world.get(TARGET.x - 1, TARGET.y, TARGET.z)).toBe(AIR);

      put('stone', TARGET.x - 1, TARGET.y - 1);
      run(1, { secondaryPressed: true });

      expect(world.get(TARGET.x - 1, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('rail'));
      expect(simulation.inventory.slots[0]?.count).toBe(3);
    });

    it('o trem num trilho leva o herói pela linha, e o trem não se gasta', () => {
      layTrack(5);
      hold('train');
      run(1, { secondaryPressed: true });

      expect(simulation.train).not.toBeNull();
      expect(events.some((event) => event.type === 'hint' && event.text.startsWith('🚂'))).toBeTrue();
      expect(simulation.inventory.slots[0]?.item).toBe('train');

      run(20);

      expect(simulation.hero.body.x).toBeGreaterThan(TARGET.x + 1.5);
      expect(simulation.hero.body.z).toBe(TARGET.z + 0.5);
      expect(simulation.hero.body.y).toBe(simulation.train?.seatY ?? -1);
    });

    it('pular desce do trem', () => {
      layTrack(5);
      hold('train');
      run(1, { secondaryPressed: true });
      run(1, { jumpHeld: true });

      expect(simulation.train).toBeNull();
    });

    it('fora do trilho, o trem conta onde ele anda', () => {
      put('stone');
      hold('train');
      run(1, { secondaryPressed: true });

      expect(simulation.train).toBeNull();
      expect(events.some((event) => event.type === 'hint' && event.text.includes('trilho'))).toBeTrue();
    });
  });

  describe('tapetes', () => {
    it('o tapete só fica em cima de chão firme', () => {
      put('stone');
      simulation.inventory.slots[0] = { item: 'carpet-red', count: 4, durability: null };
      run(1, { secondaryPressed: true });

      expect(world.get(TARGET.x - 1, TARGET.y, TARGET.z)).toBe(AIR);

      put('stone', TARGET.x - 1, TARGET.y - 1);
      run(1, { secondaryPressed: true });

      expect(world.get(TARGET.x - 1, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('carpet-red'));
      expect(simulation.inventory.slots[0]?.count).toBe(3);
    });

    it('o herói anda por cima do tapete sem subir degrau', () => {
      for (let x = 6; x < 12; x += 1) {
        put('carpet-green', x, FLOOR_TOP);
      }

      run(40, { forward: 1 });

      expect(simulation.hero.body.x).toBeGreaterThan(TARGET.x);
      expect(simulation.hero.body.y).toBe(FLOOR_TOP);
    });

    it('o tapete cai junto quando o chão dele é quebrado', () => {
      world.fill(TARGET.x, 3, TARGET.z, catalog.blockNumber('dirt'));
      put('carpet-purple', TARGET.x, 4);
      simulation.hero.look(0, -0.5);
      run(1);

      expect(simulation.target).toEqual(jasmine.objectContaining({ x: TARGET.x, y: 3 }));

      run(200, { primaryHeld: true });

      expect(world.get(TARGET.x, 4, TARGET.z)).toBe(AIR);
      expect(simulation.inventory.count('carpet-purple')).toBe(1);
    });
  });

  describe('Portal do Nether', () => {
    /** Moldura em pé ao longo de z, com o vão em x = 6, z 5 e 6, y 3 a 5; a mira cai na obsidiana atrás do vão. */
    const buildFrame = (): void => {
      for (const z of [5, 6]) {
        put('obsidian', 6, 2, z);
        put('obsidian', 6, 6, z);
      }

      for (let y = 3; y <= 5; y += 1) {
        put('obsidian', 6, y, 4);
        put('obsidian', 6, y, 7);
      }

      put('obsidian');
    };
    const isPortal = (y: number, z: number): boolean => world.get(6, y, z) === catalog.blockNumber('nether-portal');

    it('o isqueiro na moldura acende o portal e gasta um uso', () => {
      buildFrame();
      hold('flint-and-steel');
      run(1, { secondaryPressed: true });

      expect([3, 4, 5].every((y) => isPortal(y, 5) && isPortal(y, 6))).toBeTrue();
      expect(simulation.inventory.slots[0]?.durability).toBe((catalog.item('flint-and-steel').durability ?? 0) - 1);
      expect(events.some((event) => event.type === 'hint' && event.text.includes('O portal acendeu'))).toBeTrue();
    });

    it('a mira atravessa o portal aceso, como a água', () => {
      buildFrame();
      hold('flint-and-steel');
      run(1, { secondaryPressed: true });
      run(1);

      expect(simulation.target).toEqual(jasmine.objectContaining(TARGET));
    });

    it('sem moldura pronta, o isqueiro ensina a montar e não gasta', () => {
      put('obsidian');
      hold('flint-and-steel');
      run(1, { secondaryPressed: true });

      expect(isPortal(4, 5)).toBeFalse();
      expect(simulation.inventory.slots[0]?.durability).toBe(catalog.item('flint-and-steel').durability);
      expect(events.some((event) => event.type === 'hint' && event.text.includes('moldura de obsidiana em pé'))).toBeTrue();
    });

    it('parado no único portal aceso, o herói fica sabendo que falta o outro', () => {
      buildFrame();
      hold('flint-and-steel');
      run(1, { secondaryPressed: true });
      simulation.hero.teleport(6.5, 3, 5.5);
      run(100);

      expect(events.some((event) => event.type === 'hint' && event.text.includes('único portal aceso'))).toBeTrue();
    });
  });

  describe('TNT e creeper', () => {
    const TNT_FUSE_STEPS = 260;
    const isLit = (x: number, y: number, z: number): boolean =>
      [...simulation.explosions.lit].some((fuse) => fuse.x === x && fuse.y === y && fuse.z === z);
    const exploded = (): boolean => simulation.drainVisualEvents().some((event) => event.type === 'explosion');

    // Chão firme na frente da TNT: sem a regra da TNT, a tocha seria colocada ali.
    const putTntWithRoomForTorch = (): void => {
      put('tnt');
      put('stone', TARGET.x - 1, TARGET.y - 1);
    };

    it('a tocha acende a TNT mirada, em vez de virar uma tocha na frente dela', () => {
      putTntWithRoomForTorch();
      hold('torch');
      run(1, { secondaryPressed: true });

      expect(isLit(TARGET.x, TARGET.y, TARGET.z)).toBeTrue();
      expect(world.get(TARGET.x - 1, TARGET.y, TARGET.z)).toBe(AIR);
      expect(simulation.inventory.count('torch')).toBe(1);
      expect(events.some((event) => event.type === 'hint' && event.text.includes('TNT foi acesa'))).toBeTrue();
    });

    it('a tocha na TNT já acesa não vira uma tocha na frente dela', () => {
      putTntWithRoomForTorch();
      hold('torch');
      simulation.explosions.ignite(TARGET.x, TARGET.y, TARGET.z);
      run(1, { secondaryPressed: true });

      expect(world.get(TARGET.x - 1, TARGET.y, TARGET.z)).toBe(AIR);
      expect(simulation.inventory.count('torch')).toBe(1);
    });

    it('o isqueiro acende a TNT mirada e gasta um uso', () => {
      putTntWithRoomForTorch();
      hold('flint-and-steel');
      run(1, { secondaryPressed: true });

      expect(isLit(TARGET.x, TARGET.y, TARGET.z)).toBeTrue();
      expect(simulation.inventory.slots[0]?.durability).toBe((catalog.item('flint-and-steel').durability ?? 0) - 1);
      expect(events.some((event) => event.type === 'hint' && event.text.includes('TNT foi acesa'))).toBeTrue();
    });

    it('o isqueiro na TNT já acesa não gasta uso', () => {
      putTntWithRoomForTorch();
      hold('flint-and-steel');
      simulation.explosions.ignite(TARGET.x, TARGET.y, TARGET.z);
      run(1, { secondaryPressed: true });

      expect(simulation.inventory.slots[0]?.durability).toBe(catalog.item('flint-and-steel').durability);
    });

    it('o isqueiro no último uso acende a TNT e avisa que quebrou', () => {
      putTntWithRoomForTorch();
      hold('flint-and-steel', 1);
      run(1, { secondaryPressed: true });

      expect(isLit(TARGET.x, TARGET.y, TARGET.z)).toBeTrue();
      expect(simulation.inventory.slots[0]?.item).not.toBe('flint-and-steel');
      expect(events).toContain({ type: 'tool-broke', item: 'flint-and-steel' });
    });

    it('outro item na mão não acende a TNT', () => {
      put('tnt');
      hold('dirt');
      run(1, { secondaryPressed: true });

      expect([...simulation.explosions.lit]).toEqual([]);
    });

    it('a TNT acesa estoura: abre buraco e machuca quem está perto, mas a obsidiana fica', () => {
      put('tnt');
      put('obsidian', TARGET.x + 2);
      simulation.explosions.ignite(TARGET.x, TARGET.y, TARGET.z);
      run(TNT_FUSE_STEPS);

      expect(exploded()).toBeTrue();
      expect(world.get(TARGET.x, TARGET.y, TARGET.z)).toBe(AIR);
      expect(world.get(TARGET.x, FLOOR_TOP - 1, TARGET.z)).toBe(AIR);
      expect(world.get(TARGET.x + 2, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('obsidian'));
      expect(simulation.health.value).toBeLessThan(catalog.world.hero.maxHealth);
    });

    it('a explosão acende a TNT vizinha, que estoura logo depois', () => {
      put('tnt');
      put('tnt', TARGET.x + 2);
      simulation.explosions.ignite(TARGET.x, TARGET.y, TARGET.z);
      run(TNT_FUSE_STEPS);

      expect(isLit(TARGET.x + 2, TARGET.y, TARGET.z)).toBeTrue();

      run(40);

      expect(world.get(TARGET.x + 2, TARGET.y, TARGET.z)).toBe(AIR);
      expect([...simulation.explosions.lit]).toEqual([]);
    });

    it('quebrar a TNT acesa apaga o pavio, e ela volta inteira para a mochila', () => {
      put('tnt');
      simulation.explosions.ignite(TARGET.x, TARGET.y, TARGET.z);
      run(5, { primaryHeld: true });
      run(TNT_FUSE_STEPS);

      expect(exploded()).toBeFalse();
      expect(simulation.inventory.count('tnt')).toBe(1);
      expect(simulation.health.isFull).toBeTrue();
    });

    it('o creeper chia perto do herói e estoura: machuca, mas não desmancha o chão', () => {
      simulation.clock.advance(catalog.world.clock.dayMs);
      const creeper = simulation.creatures.spawn(catalog.creature('creeper'), 7, FLOOR_TOP, 5.5);

      run(120);

      expect(simulation.creatures.list).not.toContain(creeper);
      expect(events).toContain({ type: 'sound', cue: 'fireball' });
      expect(exploded()).toBeTrue();
      expect(simulation.health.value).toBeLessThan(catalog.world.hero.maxHealth);
      expect(world.get(7, FLOOR_TOP - 1, 5)).toBe(catalog.blockNumber('grass'));
    });
  });

  describe('golem de ferro', () => {
    const golems = (): readonly Creature[] => simulation.creatures.list.filter((creature) => creature.definition.id === 'iron-golem');
    const hinted = (text: string): boolean => events.some((event) => event.type === 'hint' && event.text.includes(text));

    it('usado no bloco mirado, o golem nasce na frente dele e o item é gasto', () => {
      put('stone');
      hold('iron-golem');
      run(1, { secondaryPressed: true });

      expect(golems().length).toBe(1);
      expect(golems()[0].body.x).toBeCloseTo(TARGET.x - 0.5, 1);
      expect(simulation.inventory.count('iron-golem')).toBe(0);
      expect(hinted('chegou')).toBeTrue();
    });

    it('sem espaço para o corpo grandão, o golem não nasce e o item fica', () => {
      put('stone');
      put('stone', TARGET.x - 1, TARGET.y + 1);
      hold('iron-golem');
      run(1, { secondaryPressed: true });

      expect(golems()).toEqual([]);
      expect(simulation.inventory.count('iron-golem')).toBe(1);
      expect(hinted('grandão')).toBeTrue();
    });

    it('com três golens no mundo, não nasce o quarto', () => {
      for (let count = 0; count < 3; count += 1) {
        simulation.creatures.spawn(catalog.creature('iron-golem'), 2.5 + count * 2, FLOOR_TOP, 12.5);
      }

      put('stone');
      hold('iron-golem');
      run(1, { secondaryPressed: true });

      expect(golems().length).toBe(3);
      expect(simulation.inventory.count('iron-golem')).toBe(1);
      expect(hinted('já tem 3')).toBeTrue();
    });

    it('o golpe do herói não machuca o golem', () => {
      const golem = simulation.creatures.spawn(catalog.creature('iron-golem'), 7, FLOOR_TOP, 5.5);

      golem.moodLeftMs = 60_000;
      hold('iron-sword');
      run(1, { primaryPressed: true });

      expect(simulation.targetCreature).toBe(golem);
      expect(golem.health).toBe(golem.definition.health);
      expect(hinted('é seu amigo')).toBeTrue();
    });

    it('à noite, o golem vence o zumbi, que solta o que tem', () => {
      simulation.clock.advance(catalog.world.clock.dayMs);
      simulation.creatures.spawn(catalog.creature('iron-golem'), 9.5, FLOOR_TOP, 5.5);
      const zombie = simulation.creatures.spawn(catalog.creature('scarecrow-zombie'), 13.5, FLOOR_TOP, 5.5);

      run(60 * 5);

      expect(simulation.creatures.list).not.toContain(zombie);
      expect(events).toContain({ type: 'sound', cue: 'enemyHit' });
      expect(simulation.drainVisualEvents().some((event) => event.type === 'creature-poof')).toBeTrue();
      expect(golems().length).toBe(1);
    });
  });

  describe('bonecos: a fala da Verity e a mochila do Criativo', () => {
    const VERITY_GREETING = 'Olá, eu sou Verity, eu posso falar tudo!';
    const STEPS_PER_SECOND = 60;
    const speeches = (): readonly SimulationEvent[] => events.filter((event) => event.type === 'creature-speech');
    const hinted = (text: string): boolean => events.some((event) => event.type === 'hint' && event.text.includes(text));
    const ofKind = (id: string): readonly Creature[] => simulation.creatures.list.filter((creature) => creature.definition.id === id);

    const useCreativeMode = (): void => {
      simulation = new CraftSimulation({
        catalog,
        world,
        spawn: { x: 5.5, y: FLOOR_TOP, z: 5.5, yaw: FACING_EAST },
        autoJump: false,
        randomSeed: 1,
        inventory: [],
        mode: 'creative',
      });
    };

    const placeInSight = (id: string): Creature => {
      const creature = simulation.creatures.spawn(catalog.creature(id), TARGET.x + 0.5, FLOOR_TOP, TARGET.z + 0.5);

      creature.moodLeftMs = 60_000;
      simulation.hero.look(0, -0.3);

      return creature;
    };

    it('tocar na Verity: ela fala, pula de alegria e brilha', () => {
      const verity = placeInSight('verity');

      // Recém-nascida, ela ainda não pousou: só pula quem está no chão.
      run(5);
      run(1, { secondaryPressed: true });
      run(3);

      expect(speeches()).toEqual([{ type: 'creature-speech', speaker: 'Verity', text: VERITY_GREETING }]);
      expect(verity.body.y).toBeGreaterThan(FLOOR_TOP);
      expect(simulation.drainVisualEvents().some((event) => event.type === 'sparkle')).toBeTrue();
    });

    it('tocar de novo logo em seguida não repete a fala; depois da espera, ela fala outra vez', () => {
      placeInSight('verity');

      run(1, { secondaryPressed: true });
      run(1, { secondaryPressed: true });

      expect(speeches().length).toBe(1);

      run(STEPS_PER_SECOND * 5);
      run(1, { secondaryPressed: true });

      expect(speeches().length).toBe(2);
    });

    it('com comida na mão, a Verity fala e o herói não come', () => {
      placeInSight('verity');
      simulation.health.damage(2);
      hold('apple');
      run(1, { secondaryPressed: true });

      expect(speeches().length).toBe(1);
      expect(simulation.inventory.count('apple')).toBe(1);
    });

    it('quem não tem fala continua quieto', () => {
      placeInSight('sheep');
      run(1, { secondaryPressed: true });

      expect(speeches()).toEqual([]);
    });

    it('no Criativo, a Falsity vem mansa pela mochila, não ataca e não vai embora', () => {
      useCreativeMode();
      put('stone');
      hold('falsity');
      run(1, { secondaryPressed: true });

      const [falsity] = ofKind('falsity');

      expect(falsity?.isTame).toBeTrue();
      expect(falsity?.isHostile).toBeFalse();
      expect(simulation.inventory.count('falsity')).toBe(1);
      expect(hinted('chegou para brincar')).toBeTrue();

      simulation.clock.advance(catalog.world.clock.dayMs);
      run(STEPS_PER_SECOND * 2);

      expect(simulation.creatures.list).toContain(falsity);
      expect(simulation.health.isFull).toBeTrue();
    });

    it('a mochila do Criativo tem os quatro bonecos e o minério de diamante', () => {
      useCreativeMode();

      for (const id of ['verity', 'falsity', 'cruelty', 'lovity', 'diamond-ore']) {
        simulation.giveCreativeItem(id);

        expect(simulation.inventory.count(id)).withContext(id).toBe(catalog.item(id).maxStack);
      }
    });

    it('no Criativo, o boneco da Princesa Peach vem manso pela mochila e fica para brincar', () => {
      useCreativeMode();
      put('stone');
      simulation.giveCreativeItem('boneco-peach');
      hold('boneco-peach');
      run(1, { secondaryPressed: true });

      const [peach] = ofKind('boneco-peach');

      expect(peach?.isTame).toBeTrue();
      expect(peach?.isHostile).toBeFalse();
      expect(peach?.definition.hero).toBe('peach');

      simulation.clock.advance(catalog.world.clock.dayMs);
      run(STEPS_PER_SECOND * 2);

      expect(simulation.creatures.list).toContain(peach);
    });

    it('fora do Criativo, o boneco do Mario não chama ninguém', () => {
      put('stone');
      hold('boneco-mario');
      run(1, { secondaryPressed: true });

      expect(ofKind('boneco-mario')).toEqual([]);
      expect(hinted('mochila do modo Criativo')).toBeTrue();
    });

    it('no Criativo, cabem até 5 de cada boneco', () => {
      useCreativeMode();

      for (let count = 0; count < 5; count += 1) {
        simulation.creatures.spawn(catalog.creature('lovity'), 2.5 + count, FLOOR_TOP, 12.5).isTame = true;
      }

      put('stone');
      hold('lovity');
      run(1, { secondaryPressed: true });

      expect(ofKind('lovity').length).toBe(5);
      expect(hinted('já tem 5')).toBeTrue();
    });

    it('fora do Criativo, o item do boneco não chama ninguém e fica na mão', () => {
      put('stone');
      hold('cruelty');
      run(1, { secondaryPressed: true });

      expect(ofKind('cruelty')).toEqual([]);
      expect(simulation.inventory.count('cruelty')).toBe(1);
      expect(hinted('mochila do modo Criativo')).toBeTrue();
    });
  });

  describe('água e fazenda', () => {
    const above = (): number => world.get(TARGET.x, TARGET.y + 1, TARGET.z);

    it('a enxada ara a grama e gasta um uso', () => {
      put('grass');
      hold('wooden-hoe');
      run(1, { secondaryPressed: true });

      expect(world.get(TARGET.x, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('farmland'));
      expect(simulation.inventory.slots[0]?.durability).toBe((catalog.item('wooden-hoe').durability ?? 0) - 1);
    });

    it('a enxada não ara a grama coberta', () => {
      put('grass');
      put('stone', TARGET.x, TARGET.y + 1);
      hold('wooden-hoe');
      run(1, { secondaryPressed: true });

      expect(world.get(TARGET.x, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('grass'));
    });

    it('planta a semente na terra arada e gasta uma', () => {
      put('farmland');
      simulation.inventory.slots[0] = { item: 'wheat-seeds', count: 3, durability: null };
      run(1, { secondaryPressed: true });

      expect(above()).toBe(catalog.blockNumber('wheat-crop'));
      expect(simulation.farm.plants.size).toBe(1);
      expect(simulation.inventory.slots[0]?.count).toBe(2);
    });

    it('no solo errado, não planta e conta onde a semente cresce', () => {
      put('stone');
      simulation.inventory.slots[0] = { item: 'wheat-seeds', count: 3, durability: null };
      run(1, { secondaryPressed: true });

      expect(above()).toBe(AIR);
      expect(events).toContain({ type: 'hint', text: 'Sementes de trigo: plante em terra arada.' });
    });

    it('colhe o trigo maduro e conta para a missão', () => {
      put('farmland', TARGET.x, TARGET.y - 1);
      put('wheat-crop');
      simulation.farm.plant(TARGET.x, TARGET.y, TARGET.z, catalog.crop('wheat'));
      simulation.farm.step(catalog.crop('wheat').stageMs * catalog.crop('wheat').stages);
      const record = spyOn(simulation.goals, 'record').and.callThrough();
      run(10, { primaryHeld: true });
      // A colheita pula longe do ímã de quem está parado: o herói anda até ela.
      run(90, { forward: 1 });

      expect(simulation.inventory.count('wheat')).toBe(1);
      expect(record).toHaveBeenCalledWith({ trigger: 'harvest', target: 'wheat', count: 1 });
    });

    it('o trigo verde só devolve a semente', () => {
      put('farmland', TARGET.x, TARGET.y - 1);
      put('wheat-crop');
      simulation.farm.plant(TARGET.x, TARGET.y, TARGET.z, catalog.crop('wheat'));
      run(200, { primaryHeld: true });

      expect(simulation.inventory.count('wheat')).toBe(0);
      expect(simulation.inventory.count('wheat-seeds')).toBe(1);
    });

    it('o balde vazio pega a água parada e continua na mão, cheio', () => {
      put('water');
      hold('bucket');
      run(1, { secondaryPressed: true });

      expect(world.get(TARGET.x, TARGET.y, TARGET.z)).not.toBe(catalog.blockNumber('water'));
      expect(simulation.inventory.slots[0]?.item).toBe('water-bucket');
    });

    it('de uma pilha de baldes, o balde cheio vai para a mochila', () => {
      put('water');
      simulation.inventory.slots[0] = { item: 'bucket', count: 2, durability: null };
      run(1, { secondaryPressed: true });

      expect(simulation.inventory.slots[0]).toEqual({ item: 'bucket', count: 1, durability: null });
      expect(simulation.inventory.count('water-bucket')).toBe(1);
    });

    it('o balde não pega água corrente e explica o porquê', () => {
      put('flowing-water');
      hold('bucket');
      run(1, { secondaryPressed: true });

      expect(simulation.inventory.slots[0]?.item).toBe('bucket');
      expect(events.some((event) => event.type === 'hint')).toBeTrue();
    });

    it('o balde cheio despeja uma nascente na face mirada e volta a ser balde', () => {
      put('stone');
      hold('water-bucket');
      run(1, { secondaryPressed: true });

      expect(world.get(TARGET.x - 1, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('water'));
      expect(simulation.inventory.slots[0]?.item).toBe('bucket');
    });
  });

  describe('animais', () => {
    /** Um animal parado logo à frente, com o olhar um pouco para baixo para mirar nele. */
    const placeAnimal = (id: string): Creature => {
      const creature = simulation.creatures.spawn(catalog.creature(id), TARGET.x + 0.5, FLOOR_TOP, TARGET.z + 0.5);

      creature.moodLeftMs = 60_000;
      simulation.hero.look(0, -0.3);

      return creature;
    };

    const droppedCount = (item: string): number =>
      simulation.drops.list.filter((drop) => drop.stack.item === item).reduce((sum, drop) => sum + drop.stack.count, 0);

    it('mira o animal à frente em vez do chão', () => {
      const sheep = placeAnimal('sheep');
      run(1);

      expect(simulation.targetCreature).toBe(sheep);
      expect(simulation.target).toBeNull();
    });

    it('a tesoura tosquia a ovelha: cai lã, a tesoura gasta e a lã some até crescer de novo', () => {
      const sheep = placeAnimal('sheep');
      hold('shears');
      run(1, { secondaryPressed: true });

      expect(droppedCount('wool')).toBeGreaterThanOrEqual(1);
      expect(simulation.inventory.slots[0]?.durability).toBe((catalog.item('shears').durability ?? 0) - 1);
      expect(sheep.isCoolingDown).toBeTrue();

      run(1, { secondaryPressed: true });

      expect(events).toContain({ type: 'hint', text: 'Ovelha: espere um pouquinho e tente de novo.' });
    });

    it('o balde vazio na vaca vira balde de leite', () => {
      placeAnimal('cow');
      hold('bucket');
      run(1, { secondaryPressed: true });

      expect(simulation.inventory.slots[0]?.item).toBe('milk-bucket');
    });

    it('o trigo na mão alimenta as ovelhas, e nasce um filhote que ainda não dá lã', () => {
      const first = placeAnimal('sheep');
      simulation.creatures.spawn(catalog.creature('sheep'), TARGET.x + 1.5, FLOOR_TOP, TARGET.z + 0.5).loveLeftMs = 10_000;
      simulation.inventory.slots[0] = { item: 'wheat', count: 3, durability: null };
      run(1, { secondaryPressed: true });

      expect(simulation.inventory.slots[0]?.count).toBe(2);
      expect(first.breedRestMs).toBeGreaterThan(0);

      const baby = simulation.creatures.list.find((creature) => creature.isBaby);

      expect(baby).toBeDefined();
      expect(events.some((event) => event.type === 'hint' && event.text.includes('filhote'))).toBeTrue();
    });

    it('a mão tira um pouco de vida, e o animal foge', () => {
      const sheep = placeAnimal('sheep');
      run(1, { primaryPressed: true, primaryHeld: true });

      expect(sheep.health).toBe(catalog.creature('sheep').health - 1);
      expect(sheep.mood).toBe('flee');
      expect(simulation.mining).toBeNull();
    });

    it('a espada derrota a ovelha: ela solta lã, a espada gasta e a missão conta', () => {
      const sheep = placeAnimal('sheep');
      const record = spyOn(simulation.goals, 'record').and.callThrough();
      hold('iron-sword');
      run(1, { primaryPressed: true });

      expect(simulation.creatures.list).not.toContain(sheep);
      expect(droppedCount('wool')).toBe(1);
      expect(simulation.inventory.slots[0]?.durability).toBe((catalog.item('iron-sword').durability ?? 0) - 1);
      expect(record).toHaveBeenCalledWith({ trigger: 'defeat', target: 'sheep', count: 1 });
    });
  });
  describe('adubo', () => {
    const plantWheat = (): void => {
      put('farmland', TARGET.x, TARGET.y - 1);
      put('wheat-crop');
      simulation.farm.plant(TARGET.x, TARGET.y, TARGET.z, catalog.crop('wheat'));
    };

    it('o adubo faz a planta crescer um estágio e gasta um', () => {
      plantWheat();
      simulation.inventory.slots[0] = { item: 'fertilizer', count: 2, durability: null };
      run(1, { secondaryPressed: true });

      expect(simulation.farm.stageAt(TARGET.x, TARGET.y, TARGET.z)).toBe(1);
      expect(simulation.inventory.slots[0]?.count).toBe(1);
    });

    it('sem planta crescendo, o adubo não é gasto e o jogo explica', () => {
      put('stone');
      simulation.inventory.slots[0] = { item: 'fertilizer', count: 2, durability: null };
      run(1, { secondaryPressed: true });

      expect(simulation.inventory.slots[0]?.count).toBe(2);
      expect(events.some((event) => event.type === 'hint')).toBeTrue();
    });

    it('a batata planta na terra arada e, colhida madura, dá batatas', () => {
      put('farmland');
      simulation.inventory.slots[0] = { item: 'potato', count: 1, durability: null };
      run(1, { secondaryPressed: true });

      expect(world.get(TARGET.x, TARGET.y + 1, TARGET.z)).toBe(catalog.blockNumber('potato-crop'));
    });
  });

  describe('sobreviver', () => {
    const makeNight = (): void => {
      simulation.clock.advance(catalog.world.clock.dayMs);
    };

    it('comer a maçã recupera vida e gasta uma', () => {
      simulation.health.damage(4);
      simulation.inventory.slots[0] = { item: 'apple', count: 2, durability: null };
      run(1, { secondaryPressed: true });

      expect(simulation.health.value).toBe(catalog.world.hero.maxHealth - 4 + (catalog.item('apple').heal ?? 0));
      expect(simulation.inventory.slots[0]?.count).toBe(1);
    });

    it('com a vida cheia, a comida fica guardada', () => {
      simulation.inventory.slots[0] = { item: 'apple', count: 2, durability: null };
      run(1, { secondaryPressed: true });

      expect(simulation.inventory.slots[0]?.count).toBe(2);
      expect(events.some((event) => event.type === 'hint')).toBeTrue();
    });

    it('beber o leite devolve o balde', () => {
      simulation.health.damage(2);
      hold('milk-bucket');
      run(1, { secondaryPressed: true });

      expect(simulation.inventory.slots[0]?.item).toBe('bucket');
    });

    it('a cama de dia guarda o lugar de voltar, sem pular o tempo', () => {
      put('bed');
      const before = simulation.clock.time;
      run(1, { secondaryPressed: true });

      expect(simulation.respawnPoint).toEqual(jasmine.objectContaining({ x: TARGET.x + 0.5, z: TARGET.z + 0.5 }));
      expect(simulation.clock.time).toBeGreaterThan(before);
      expect(simulation.clock.isNight).toBeFalse();
    });

    it('a cama à noite faz dormir até de manhã, manda os inimigos embora e conta para a missão', () => {
      put('bed');
      makeNight();
      const slime = simulation.creatures.spawn(catalog.creature('mud-slime'), 12.5, FLOOR_TOP, 12.5);
      const record = spyOn(simulation.goals, 'record').and.callThrough();
      run(1, { secondaryPressed: true });

      expect(simulation.clock.isNight).toBeFalse();
      expect(simulation.creatures.list).not.toContain(slime);
      expect(record).toHaveBeenCalledWith({ trigger: 'sleep', target: null, count: 1 });
    });

    it('ao desmaiar, o herói volta para casa com a vida cheia e todos os itens', () => {
      makeNight();
      simulation.inventory.slots[3] = { item: 'stone', count: 20, durability: null };
      simulation.respawnPoint = { x: 2.5, y: FLOOR_TOP, z: 2.5, yaw: 0 };
      simulation.health.damage(catalog.world.hero.maxHealth - 1);
      simulation.creatures.spawn(catalog.creature('scarecrow-zombie'), 6.4, FLOOR_TOP, 5.5);
      run(120);

      expect(simulation.hero.body.x).toBeLessThan(4);
      expect(simulation.health.isFull).toBeTrue();
      expect(simulation.inventory.count('stone')).toBe(20);
      expect(events.some((event) => event.type === 'hero-hurt')).toBeTrue();
    });

    it('o arco atira uma flecha e gasta uma da mochila', () => {
      hold('bow');
      simulation.inventory.slots[5] = { item: 'arrow', count: 3, durability: null };
      run(1, { primaryPressed: true });

      expect(simulation.projectiles.list.length).toBe(1);
      expect(simulation.inventory.count('arrow')).toBe(2);
    });

    it('o arco sem flechas explica o que falta', () => {
      hold('bow');
      run(1, { primaryPressed: true });

      expect(simulation.projectiles.list.length).toBe(0);
      expect(events.some((event) => event.type === 'hint')).toBeTrue();
    });

    it('a manhã nova vira o dia do calendário, e dormir também', () => {
      // Perto do fim da noite: poucos passos atravessam a virada da manhã.
      simulation.clock.setTime(simulation.clock.cycleMs - 50);
      run(10);

      expect(simulation.calendar.day).toBe(2);

      put('bed');
      makeNight();
      run(1, { secondaryPressed: true });

      expect(simulation.calendar.day).toBe(3);
    });

    it('no inverno, só a planta debaixo do vidro cresce', () => {
      const definition = catalog.world.calendar;
      const winterDay = definition.daysPerSeason * definition.seasons.findIndex((season) => season.id === 'winter') + 1;

      simulation.setCalendarDay(winterDay);
      expect(simulation.calendar.season.id).toBe('winter');

      const wheat = catalog.crop('wheat');
      const open = { x: 2, z: 2 } as const;
      const covered = { x: 12, z: 12 } as const;

      for (const cell of [open, covered]) {
        put('farmland', cell.x, FLOOR_TOP - 1, cell.z);
        put('wheat-crop', cell.x, FLOOR_TOP, cell.z);
        simulation.farm.plant(cell.x, FLOOR_TOP, cell.z, wheat);
      }

      put('glass', covered.x, FLOOR_TOP + 3, covered.z);
      simulation.farm.step(wheat.stageMs * 1.1);

      expect(simulation.farm.stageAt(open.x, FLOOR_TOP, open.z)).toBe(0);
      expect(simulation.farm.stageAt(covered.x, FLOOR_TOP, covered.z)).toBe(1);
    });

    it('ligar o Modo Paz manda os inimigos embora na hora', () => {
      makeNight();
      const spider = simulation.creatures.spawn(catalog.creature('button-spider'), 12.5, FLOOR_TOP, 12.5);
      simulation.setPeaceful(true);

      expect(simulation.creatures.list).not.toContain(spider);
    });
  });
  describe('primeiros passos e missões', () => {
    it('o guia acompanha os gestos e avisa quando acaba', () => {
      const guided = new CraftSimulation({
        catalog,
        world,
        spawn: { x: 5.5, y: FLOOR_TOP, z: 5.5, yaw: FACING_EAST },
        autoJump: false,
        randomSeed: 1,
        inventory: [],
        guideFirstSteps: true,
      });
      const go = (steps: number, input: Partial<CraftInputSnapshot>): void => {
        for (let step = 0; step < steps; step += 1) {
          guided.step({ ...IDLE_CRAFT_INPUT, ...input });
        }
      };

      world.fill(TARGET.x, TARGET.y, TARGET.z, catalog.blockNumber('dirt'));
      go(60, { strafe: 1 });
      expect(guided.firstSteps?.current).toBe('look');

      guided.look({ yaw: 1.2, pitch: 0 });
      guided.look({ yaw: -1.2, pitch: 0 });
      expect(guided.firstSteps?.current).toBe('jump');

      go(1, { jumpHeld: true });
      expect(guided.firstSteps?.current).toBe('break');

      guided.drainEvents();
      guided.skipFirstSteps();
      expect(guided.drainEvents()).toContain({ type: 'first-steps-done' });
    });

    it('sem o pedido, não há guia', () => {
      expect(simulation.firstSteps).toBeNull();
    });

    it('a missão mostra a figura do item: o tronco, a mesa colocada, o trigo colhido, a cama', () => {
      const icon = (id: string): string | null => goalIcon(catalog.goals.find((goal) => goal.id === id) ?? catalog.goals[0], catalog);

      expect(icon('get-wood')).toBe('oak-log');
      expect(icon('place-workbench')).toBe('workbench');
      expect(icon('harvest-wheat')).toBe('wheat');
      expect(icon('sleep')).toBe('bed');
    });
  });
  describe('modos de jogo', () => {
    const withMode = (mode: 'creative' | 'survival'): CraftSimulation =>
      new CraftSimulation({
        catalog,
        world,
        spawn: { x: 5.5, y: FLOOR_TOP, z: 5.5, yaw: FACING_EAST },
        autoJump: false,
        randomSeed: 1,
        inventory: [],
        mode,
      });

    const steps = (running: CraftSimulation, count: number, input: Partial<CraftInputSnapshot> = {}): void => {
      for (let step = 0; step < count; step += 1) {
        running.step({ ...IDLE_CRAFT_INPUT, ...input });
      }
    };

    it('criativo: o bloco colocado não acaba e quebrar é na hora', () => {
      const creative = withMode('creative');

      put('stone');
      creative.inventory.slots[0] = { item: 'oak-planks', count: 1, durability: null };
      steps(creative, 1, { secondaryPressed: true });

      expect(world.get(TARGET.x - 1, TARGET.y, TARGET.z)).toBe(catalog.blockNumber('oak-planks'));
      expect(creative.inventory.slots[0]?.count).toBe(1);

      steps(creative, 5, { primaryHeld: true });

      expect(world.get(TARGET.x - 1, TARGET.y, TARGET.z)).toBe(AIR);
    });

    it('criativo: o espantalho não tira vida, e pegar item da lista enche a mochila', () => {
      const creative = withMode('creative');

      creative.clock.advance(catalog.world.clock.dayMs);
      creative.creatures.spawn(catalog.creature('scarecrow-zombie'), 6.4, FLOOR_TOP, 5.5);
      steps(creative, 120);

      expect(creative.health.isFull).toBeTrue();

      creative.giveCreativeItem('diamond-que-nao-existe');
      creative.giveCreativeItem('glass');

      expect(creative.inventory.count('glass')).toBe(catalog.item('glass').maxStack);
    });

    it('criativo: segurar o pulo no ar faz voar', () => {
      const creative = withMode('creative');

      steps(creative, 60, { jumpHeld: true });

      expect(creative.hero.body.y).toBeGreaterThan(FLOOR_TOP + 2);
    });

    it('sobrevivência: sem energia a vida não volta, mas nunca diminui', () => {
      const survival = withMode('survival');
      const energy = survival.energy;

      expect(energy).not.toBeNull();
      energy?.set(0);
      survival.health.damage(2);
      steps(survival, Math.ceil(catalog.world.hero.regenEveryMs / (1000 / 60)) * 2);

      expect(survival.health.value).toBe(catalog.world.hero.maxHealth - 2);
    });

    it('sobrevivência: comer enche a energia mesmo com a vida cheia', () => {
      const survival = withMode('survival');

      survival.energy?.set(4);
      survival.inventory.slots[0] = { item: 'bread', count: 2, durability: null };
      steps(survival, 1, { secondaryPressed: true });

      expect(survival.energy?.value).toBe(4 + (catalog.item('bread').heal ?? 0));
      expect(survival.inventory.slots[0]?.count).toBe(1);
    });

    it('aventura: não há energia', () => {
      expect(simulation.energy).toBeNull();
      expect(simulation.mode).toBe('adventure');
    });
  });
  describe('noites mais justas', () => {
    const makeNight = (): void => {
      simulation.clock.advance(catalog.world.clock.dayMs);
    };

    it('a armadura na mochila segura o golpe: gasta um uso e não tira coração', () => {
      makeNight();
      simulation.inventory.slots[8] = { item: 'leather-armor', count: 1, durability: catalog.item('leather-armor').durability };
      simulation.creatures.spawn(catalog.creature('scarecrow-zombie'), 6.4, FLOOR_TOP, 5.5);
      run(20);

      expect(simulation.health.isFull).toBeTrue();
      expect(simulation.inventory.slots[8]?.durability).toBeLessThan(catalog.item('leather-armor').durability ?? 0);
      expect(hudOf(simulation).armor).toBe(simulation.inventory.slots[8]?.durability ?? -1);
    });

    it('o escudo na mão segura a flecha', () => {
      hold('shield');
      simulation.projectiles.launch({
        owner: 'creature',
        damage: 1,
        x: 9.5,
        y: FLOOR_TOP + 1,
        z: 5.5,
        directionX: -1,
        directionY: 0.05,
        directionZ: 0,
        speed: 16,
      });
      run(30);

      expect(simulation.health.isFull).toBeTrue();
      expect(simulation.inventory.slots[0]?.durability).toBe((catalog.item('shield').durability ?? 0) - 1);
    });

    it('sem escudo, a flecha tira coração', () => {
      simulation.projectiles.launch({
        owner: 'creature',
        damage: 1,
        x: 9.5,
        y: FLOOR_TOP + 1,
        z: 5.5,
        directionX: -1,
        directionY: 0.05,
        directionZ: 0,
        speed: 16,
      });
      run(30);

      expect(simulation.health.value).toBe(catalog.world.hero.maxHealth - 1);
    });

    it('o pôr do sol avisa para acender tochas', () => {
      simulation.clock.setTime(catalog.world.clock.dayMs - 10_000);
      run(2);

      expect(events.some((event) => event.type === 'hint' && event.text.includes('sol está se pondo'))).toBeTrue();
    });

    it('com o Modo Paz, o pôr do sol não assusta ninguém', () => {
      simulation.setPeaceful(true);
      simulation.clock.setTime(catalog.world.clock.dayMs - 10_000);
      run(2);

      expect(events.some((event) => event.type === 'hint')).toBeFalse();
    });
  });
});
