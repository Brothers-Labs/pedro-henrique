import { SeededRandom } from '../../../pedro-maker/levels/seeded-random';
import { STEP_MS } from '../../config/craft-physics.config';
import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import { HAND_ATTACK_COOLDOWN_MS, HAND_DAMAGE, HAND_KNOCKBACK } from '../../content/parsers/parse-items';
import type { BucketStats, ItemDefinition } from '../../models/content.model';
import type { SpawnPoint } from '../../world/world-generator';
import type { VoxelWorld } from '../../world/voxel-world';
import { BlockProperties, type PhysicsTerrain, physicsTerrain } from '../block-properties';
import type { CraftInputSnapshot } from '../input/craft-input';
import type { LookDelta } from '../input/craft-input-reader';
import { BlockActions } from './block-actions';
import { breakDurationMs, canHarvest, missingToolHint, rollLoot } from './block-rules';
import { type Creature, Creatures } from './creatures';
import { Farm } from './farm';
import { type GoalEvent, type GoalProgress, GoalTracker } from './goal-tracker';
import { HeroMotion } from './hero-motion';
import { tickFurnace } from './furnace';
import { HOTBAR_SIZE, Inventory, type ItemStack, type SlotClick, type SlotContent } from './inventory';
import { type DropCollector, ItemDrops } from './item-drops';
import { castRay, type RayHit } from './raycast';
import { type CraftScreen, ScreenController, type SlotRef } from './screens';
import type { SimulationEvent, VisualEvent } from './simulation-events';
import { WaterFlow } from './water-flow';

/** Folga entre dois blocos quebrados segurando o botão: dá para ver um sumir antes do outro. */
const BREAK_COOLDOWN_MS = 150;

const SOIL_LIST = new Intl.ListFormat('pt-BR', { type: 'disjunction' });

export interface CraftSimulationOptions {
  readonly catalog: CraftCatalog;
  readonly world: VoxelWorld;
  readonly spawn: SpawnPoint;
  readonly autoJump: boolean;
  /** Semente dos sorteios do jogo (drops); a mesma semente repete a mesma partida nos testes. */
  readonly randomSeed: number;
  /** Inventário guardado; sem ele, o herói começa com o `startingInventory` do mundo. */
  readonly inventory?: readonly SlotContent[];
  readonly goals?: GoalProgress;
}

/** Bloco sendo quebrado e quanto já foi. */
export interface MiningState {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  elapsedMs: number;
  readonly durationMs: number;
}

/**
 * O mundo em movimento, um passo fixo de cada vez.
 *
 * Não conhece three.js nem a página: recebe a entrada do passo, muda o
 * estado e anota eventos. O desenho só lê o que está aqui; a tela recebe os
 * eventos. Os testes rodam isto sem navegador de verdade.
 */
export class CraftSimulation {
  readonly catalog: CraftCatalog;
  readonly world: VoxelWorld;
  readonly properties: BlockProperties;
  readonly terrain: PhysicsTerrain;
  readonly hero: HeroMotion;
  readonly inventory: Inventory;
  readonly drops = new ItemDrops();
  readonly goals: GoalTracker;
  readonly screens: ScreenController;
  readonly water: WaterFlow;
  readonly farm: Farm;
  readonly creatures: Creatures;

  selectedSlot = 0;
  target: RayHit | null = null;
  /** Animal na mira, mais perto que qualquer bloco: o botão de quebrar vira golpe e o de usar vale para ele. */
  targetCreature: Creature | null = null;
  mining: MiningState | null = null;

  private readonly actions: BlockActions;
  private readonly collector: DropCollector;
  private readonly random: () => number;
  private readonly events: SimulationEvent[] = [];
  private readonly visualEvents: VisualEvent[] = [];
  private autoJump: boolean;
  private breakCooldownMs = 0;
  private attackCooldownMs = 0;
  private hintedCell = -1;
  private version = 0;

  constructor(options: CraftSimulationOptions) {
    this.catalog = options.catalog;
    this.world = options.world;
    this.properties = new BlockProperties(options.catalog);
    this.terrain = physicsTerrain(options.world, this.properties);
    this.hero = new HeroMotion(options.spawn.x, options.spawn.y, options.spawn.z, options.spawn.yaw);
    this.autoJump = options.autoJump;
    this.inventory = new Inventory(options.catalog);
    this.goals = new GoalTracker(options.catalog.goals, options.goals);

    const seeded = new SeededRandom(options.randomSeed);
    this.random = () => seeded.next();
    this.water = new WaterFlow(this.world, this.catalog);
    this.farm = new Farm(this.world, this.catalog, this.properties, seeded, {
      isOccupied: (minX, minY, minZ, maxX, maxY, maxZ) => this.hero.body.occupies(minX, minY, minZ, maxX, maxY, maxZ),
      grew: (x, y, z) => this.visualEvents.push({ type: 'crop-grew', x, y, z }),
    });
    this.creatures = new Creatures(this.world, this.catalog, this.properties, seeded, {
      hero: () => this.hero.body,
      laid: (creature, item) => {
        const body = creature.body;

        this.drops.spawn(body.x, body.y + body.height / 2, body.z, { item, count: 1, durability: null }, this.random);
      },
    });

    if (options.inventory) {
      options.inventory.forEach((slot, index) => (this.inventory.slots[index] = slot));
    } else {
      options.catalog.world.hero.startingInventory.forEach((entry) => this.inventory.add(entry.item, entry.count));
    }

    this.actions = new BlockActions({
      catalog: this.catalog,
      world: this.world,
      properties: this.properties,
      drops: this.drops,
      random: this.random,
      visual: (event) => this.visualEvents.push(event),
      placed: (block) => this.recordGoal({ trigger: 'place', target: block.id, count: 1 }),
      removed: (x, y, z) => {
        for (const stack of this.screens.remove(this.world.indexOf(x, y, z))) {
          this.drops.spawn(x + 0.5, y + 0.5, z + 0.5, stack, this.random);
        }
      },
      harvest: (x, y, z) => {
        const harvest = this.farm.harvestAt(x, y, z);

        if (harvest) {
          this.recordGoal({ trigger: 'harvest', target: harvest.crop.id, count: 1 });
        }

        return harvest?.loot ?? null;
      },
      bodies: () => [this.hero.body, ...this.creatures.list.map((creature) => creature.body)],
    });

    this.screens = new ScreenController({
      catalog: this.catalog,
      inventory: this.inventory,
      receive: (stack) => this.receive(stack),
      dropNearHero: (stack) => this.dropNearHero(stack),
    });

    const body = this.hero.body;

    // O ímã puxa para a altura da cintura do herói, não para os pés.
    this.collector = {
      get x(): number {
        return body.x;
      },
      get y(): number {
        return body.y + body.height / 2;
      },
      get z(): number {
        return body.z;
      },
      roomFor: (item) => this.inventory.roomFor(item),
      collect: (stack) => this.collect(stack),
    };
  }

  /** Muda sempre que algo do HUD muda (barra, item escolhido, missão): a tela só redesenha quando precisa. */
  get hudVersion(): number {
    return this.version;
  }

  get selectedItem(): ItemDefinition | null {
    const slot = this.inventory.slots[this.selectedSlot];

    return slot ? this.catalog.item(slot.item) : null;
  }

  /** Quanto do bloco mirado já foi quebrado, de 0 a 1. */
  get miningProgress(): number {
    return this.mining ? Math.min(1, this.mining.elapsedMs / this.mining.durationMs) : 0;
  }

  /** Os olhos estão dentro da água? Muda a cor e a névoa da tela. */
  get isEyeUnderwater(): boolean {
    const body = this.hero.body;

    return this.terrain.isLiquid(Math.floor(body.x), Math.floor(this.hero.eyeY), Math.floor(body.z));
  }

  setAutoJump(isEnabled: boolean): void {
    this.autoJump = isEnabled;
  }

  look(delta: LookDelta): void {
    this.hero.look(delta.yaw, delta.pitch);
  }

  step(input: CraftInputSnapshot): void {
    // Com uma tela aberta o mundo espera a criança; quem para o relógio é a sessão.
    if (this.screens.screen) {
      return;
    }

    this.applySelection(input);
    this.hero.step(this.terrain, input, this.autoJump);
    this.target = this.findTarget();
    this.targetCreature = this.findCreature(this.target?.distance ?? this.catalog.world.hero.reach);

    if (this.targetCreature) {
      this.target = null;
    }

    this.updateMining(input);
    this.attackCooldownMs = Math.max(0, this.attackCooldownMs - STEP_MS);

    if (input.primaryPressed) {
      this.visualEvents.push({ type: 'swing' });
      this.attack();
    }

    if (input.secondaryPressed) {
      this.use();
    }

    this.drops.step(this.terrain, this.collector);
    this.creatures.step(this.terrain);
    this.water.step(STEP_MS);
    this.farm.step(STEP_MS);
    this.tickFurnaces(STEP_MS);

    if (input.inventoryPressed) {
      this.openScreen('inventory');
    }
  }

  /** As fornalhas assam mesmo com a tela delas aberta: a criança gosta de ver o pão ficar pronto. */
  tickFurnaces(elapsedMs: number): void {
    for (const furnace of this.screens.furnaces.values()) {
      tickFurnace(furnace, this.catalog, elapsedMs);
    }
  }

  selectSlot(index: number): void {
    if (index >= 0 && index < HOTBAR_SIZE && index !== this.selectedSlot) {
      this.selectedSlot = index;
      this.mining = null;
      this.version += 1;
    }
  }

  /**
   * Abre uma tela por cima do mundo. Quando quem abriu foi o próprio jogo (a
   * tecla, a mesa tocada), a tela de fora é avisada; quando foi a tela de fora
   * (o botão da mochila), ela já sabe.
   */
  openScreen(kind: CraftScreen, options: { readonly cell?: number; readonly announce?: boolean } = {}): void {
    this.screens.open(kind, options.cell ?? -1);
    this.mining = null;

    if (options.announce ?? true) {
      this.events.push({ type: 'open-screen', screen: kind });
    }
  }

  /** Toque num espaço de qualquer área da tela aberta. */
  clickSlot(ref: SlotRef, mode: SlotClick): void {
    this.screens.click(ref, mode);
    this.version += 1;
  }

  /** Pega o que a grade de fabricar montou. */
  takeGridResult(): void {
    if (this.screens.takeGridResult()) {
      this.celebrateCraft();
    }
  }

  /** Fabrica pelo livro de receitas, direto da mochila. */
  craftRecipe(recipeId: string): void {
    if (this.screens.craftRecipe(recipeId)) {
      this.celebrateCraft();
    }
  }

  /** Fecha a tela: a grade e a mão voltam à mochila, e o que não couber cai no chão. */
  closeScreen(): void {
    this.screens.close();
    this.version += 1;
  }

  /** Eventos anotados desde a última leitura; quem lê esvazia a fila. */
  drainEvents(): readonly SimulationEvent[] {
    return this.events.splice(0, this.events.length);
  }

  drainVisualEvents(): readonly VisualEvent[] {
    return this.visualEvents.splice(0, this.visualEvents.length);
  }

  private applySelection(input: CraftInputSnapshot): void {
    if (input.hotbarSlot !== null) {
      this.selectSlot(input.hotbarSlot);
    } else if (input.hotbarScroll !== 0) {
      this.selectSlot((this.selectedSlot + input.hotbarScroll + HOTBAR_SIZE) % HOTBAR_SIZE);
    }
  }

  /** A mira atravessa a água: dá para quebrar e construir no fundo do lago. */
  private findTarget(): RayHit | null {
    const properties = this.properties;

    return this.castFromEyes((block) => block !== AIR && properties.isLiquid[block] === 0);
  }

  /** Animal na mira até `reach`: quem passa na frente do bloco mirado ganha a mira. */
  private findCreature(reach: number): Creature | null {
    const hero = this.hero;

    return this.creatures.castRay({ x: hero.body.x, y: hero.eyeY, z: hero.body.z }, hero.lookDirection, reach)?.creature ?? null;
  }

  private castFromEyes(isTarget: (block: number) => boolean): RayHit | null {
    const hero = this.hero;
    const body = hero.body;
    const world = this.world;

    return castRay({ x: body.x, y: hero.eyeY, z: body.z }, hero.lookDirection, this.catalog.world.hero.reach, (x, y, z) =>
      isTarget(world.get(x, y, z)),
    );
  }

  /** Segurar o botão vai quebrando o bloco mirado; mirar outro recomeça do zero. */
  private updateMining(input: CraftInputSnapshot): void {
    this.breakCooldownMs = Math.max(0, this.breakCooldownMs - STEP_MS);

    const target = this.target;

    if (!input.primaryHeld || !target || this.breakCooldownMs > 0) {
      this.mining = null;
      return;
    }

    const isSameCell = this.mining && this.mining.x === target.x && this.mining.y === target.y && this.mining.z === target.z;

    if (!isSameCell) {
      this.mining = this.startMining(target);
    }

    const mining = this.mining;

    if (!mining) {
      return;
    }

    mining.elapsedMs += STEP_MS;

    if (mining.elapsedMs >= mining.durationMs) {
      this.finishMining(mining);
    }
  }

  private startMining(target: RayHit): MiningState | null {
    const block = this.catalog.blockAt(this.world.get(target.x, target.y, target.z));
    const tool = this.selectedItem?.tool ?? null;
    const durationMs = block ? breakDurationMs(block, tool) : null;

    if (!block || durationMs === null) {
      return null;
    }

    const cell = this.world.indexOf(target.x, target.y, target.z);
    const hint = canHarvest(block, tool) ? null : missingToolHint(block);

    if (hint && cell !== this.hintedCell) {
      this.hintedCell = cell;
      this.events.push({ type: 'hint', text: hint });
    }

    return { x: target.x, y: target.y, z: target.z, elapsedMs: 0, durationMs };
  }

  private finishMining(mining: MiningState): void {
    const block = this.catalog.blockAt(this.world.get(mining.x, mining.y, mining.z));
    const held = this.selectedItem;

    this.mining = null;
    this.breakCooldownMs = BREAK_COOLDOWN_MS;

    if (!block) {
      return;
    }

    this.actions.breakBlock(mining.x, mining.y, mining.z, held);
    this.events.push({ type: 'sound', cue: 'break' });

    if (held?.tool && held.tool.type === block.tool && (block.hardness ?? 0) > 0) {
      this.wearSelected(held);
    }
  }

  private wearSelected(held: ItemDefinition): void {
    if (this.inventory.wear(this.selectedSlot)) {
      this.events.push({ type: 'tool-broke', item: held.id });
    }

    this.version += 1;
  }

  /** Golpe no animal mirado, no ritmo do item da mão: a espada bate mais forte e gasta um uso. */
  private attack(): void {
    const creature = this.targetCreature;

    if (!creature || this.attackCooldownMs > 0) {
      return;
    }

    const held = this.selectedItem;
    const body = this.hero.body;
    const isDefeated = this.creatures.hit(creature, held?.damage ?? HAND_DAMAGE, held?.knockback ?? HAND_KNOCKBACK, body.x, body.z);

    this.attackCooldownMs = held?.attackCooldownMs ?? HAND_ATTACK_COOLDOWN_MS;
    this.events.push({ type: 'sound', cue: 'enemyHit' });

    if (held?.kind === 'weapon') {
      this.wearSelected(held);
    }

    if (isDefeated) {
      this.defeat(creature);
    }
  }

  /** O animal derrotado vira uma nuvem e solta o que dá. */
  private defeat(creature: Creature): void {
    const { body, definition } = creature;

    if (definition.drops) {
      this.dropLoot(definition.drops, body.x, body.y + body.height / 2, body.z);
    }

    this.visualEvents.push({ type: 'creature-defeated', x: body.x, y: body.y, z: body.z, color: definition.colors[0] });
    this.recordGoal({ trigger: 'defeat', target: definition.id, count: 1 });
  }

  /** Item da mão usado no animal: a tesoura na ovelha dá lã, o balde na vaca vira leite. */
  private useOnCreature(creature: Creature): void {
    const held = this.selectedItem;
    const interaction = held ? creature.definition.interactions.find((entry) => entry.item === held.id) : undefined;

    if (!held || !interaction) {
      return;
    }

    if (!creature.canUse(interaction)) {
      this.events.push({ type: 'hint', text: `${creature.definition.name}: espere um pouquinho e tente de novo.` });
      return;
    }

    const body = creature.body;

    creature.startCooldown(interaction);

    if (interaction.loot) {
      this.dropLoot(interaction.loot, body.x, body.y + body.height / 2, body.z);
    }

    if (interaction.convertsItemTo) {
      this.exchangeSelected(interaction.convertsItemTo);
    } else if (held.durability !== null) {
      this.wearSelected(held);
    }

    this.confirmUse();
  }

  private dropLoot(table: string, x: number, y: number, z: number): void {
    for (const entry of rollLoot(this.catalog.lootTable(table), this.random)) {
      this.drops.spawn(x, y, z, { item: entry.item, count: entry.count, durability: null }, this.random);
    }
  }

  /** Botão de usar: vale para o animal mirado; abre a mesa, o baú ou a fornalha; abre a porta; senão, usa o item da mão. */
  private use(): void {
    if (this.targetCreature) {
      this.useOnCreature(this.targetCreature);
      return;
    }

    const target = this.target;
    const interaction = target ? (this.catalog.blockAt(this.world.get(target.x, target.y, target.z))?.interaction ?? null) : null;

    if (target && interaction && interaction !== 'bed') {
      this.openScreen(interaction, { cell: this.world.indexOf(target.x, target.y, target.z) });
      return;
    }

    if (target && this.actions.toggle(target.x, target.y, target.z)) {
      this.events.push({ type: 'sound', cue: 'button' });
      return;
    }

    const held = this.selectedItem;

    if (held) {
      this.useHeld(held, target);
    }
  }

  /** O item da mão no bloco mirado: balde, enxada, semente ou bloco para colocar. */
  private useHeld(held: ItemDefinition, target: RayHit | null): void {
    if (held.bucket) {
      this.useBucket(held.bucket, target);
      return;
    }

    if (!target) {
      return;
    }

    if (held.tool?.type === 'hoe') {
      if (this.actions.till(target.x, target.y, target.z)) {
        this.wearSelected(held);
        this.confirmUse();
      }
      return;
    }

    if (held.plants) {
      this.plant(target, held, held.plants);
      return;
    }

    if (this.actions.place(target, held)) {
      this.inventory.consume(this.selectedSlot);
      this.confirmUse();
    }
  }

  /** O balde vazio pega a nascente mirada; o cheio despeja na face mirada. */
  private useBucket(bucket: BucketStats, target: RayHit | null): void {
    if (bucket.collects) {
      const hit = this.castFromEyes((block) => block !== AIR);

      if (hit && this.actions.scoop(hit.x, hit.y, hit.z, bucket.collects)) {
        this.exchangeSelected(bucket.becomes);
        this.confirmUse();
      } else if (hit && this.properties.isLiquid[this.world.get(hit.x, hit.y, hit.z)] === 1) {
        this.events.push({ type: 'hint', text: 'Esta água está escorrendo. Pegue água parada, do lago ou do riacho.' });
      }
      return;
    }

    if (bucket.places && target && this.actions.placeBlock(target, this.catalog.block(bucket.places))) {
      this.exchangeSelected(bucket.becomes);
      this.confirmUse();
    }
  }

  /** Planta no solo mirado; no solo errado, conta onde a semente cresce. */
  private plant(target: RayHit, held: ItemDefinition, cropId: string): void {
    const crop = this.catalog.crop(cropId);
    const ground = this.catalog.blockAt(this.world.get(target.x, target.y, target.z));

    if (!ground || !crop.soil.includes(ground.id)) {
      const soils = SOIL_LIST.format(crop.soil.map((soil) => this.catalog.block(soil).name.toLowerCase()));

      this.events.push({ type: 'hint', text: `${held.name}: plante em ${soils}.` });
      return;
    }

    if (this.actions.plant(target.x, target.y, target.z, this.catalog.block(crop.block))) {
      this.farm.plant(target.x, target.y + 1, target.z, crop);
      this.inventory.consume(this.selectedSlot);
      this.confirmUse();
    }
  }

  /**
   * Troca uma unidade do item da mão por outra (balde vazio ↔ balde com água).
   * Sozinho, o item troca no lugar e continua na mão; de uma pilha, o novo vai
   * para a mochila.
   */
  private exchangeSelected(itemId: string): void {
    const slot = this.inventory.slots[this.selectedSlot];

    if (slot && slot.count > 1) {
      const stack: ItemStack = { item: itemId, count: 1, durability: null };

      this.inventory.consume(this.selectedSlot);

      const left = this.receive(stack);

      if (left > 0) {
        this.dropNearHero({ ...stack, count: left });
      }
      return;
    }

    this.inventory.replace(this.selectedSlot, itemId);
    this.recordGoal({ trigger: 'obtain', target: itemId, count: 1 });
  }

  private confirmUse(): void {
    this.events.push({ type: 'sound', cue: 'button' });
    this.visualEvents.push({ type: 'swing' });
    this.version += 1;
  }

  private dropNearHero(stack: ItemStack): void {
    const body = this.hero.body;

    this.drops.spawn(body.x, body.y + 1, body.z, stack, this.random);
  }

  private recordGoal(event: GoalEvent): void {
    const completed = this.goals.record(event);

    if (completed) {
      this.events.push({ type: 'goal-completed', goal: completed });
      this.events.push({ type: 'sound', cue: 'checkpoint' });
    }

    this.version += 1;
  }

  private celebrateCraft(): void {
    this.events.push({ type: 'sound', cue: 'powerup' });
    this.version += 1;
  }

  /** Recolhe uma pilha do chão: guarda, avisa a tela e conta para a missão. */
  private collect(stack: ItemStack): number {
    const left = this.receive(stack);
    const stored = stack.count - left;

    if (stored > 0) {
      this.events.push({ type: 'pickup', item: stack.item, count: stored });
      this.events.push({ type: 'sound', cue: 'coin' });
    }

    return left;
  }

  /** Guarda algo que acabou de chegar à mochila (recolhido, fabricado, assado) e conta para a missão. */
  private receive(stack: ItemStack): number {
    const left = this.inventory.add(stack.item, stack.count, stack.durability);
    const stored = stack.count - left;

    if (stored > 0) {
      this.recordGoal({ trigger: 'obtain', target: stack.item, count: stored });
    }

    return left;
  }
}
