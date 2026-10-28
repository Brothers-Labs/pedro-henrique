import type { SeededRandom } from '../../../pedro-maker/levels/seeded-random';
import { HERO_PHYSICS, STEP_MS } from '../../config/craft-physics.config';
import { AIR, type CraftCatalog } from '../../content/craft-catalog';
import type { CreatureDefinition, CreatureInteraction } from '../../models/content.model';
import type { VoxelWorld } from '../../world/voxel-world';
import type { BlockProperties, PhysicsTerrain } from '../block-properties';
import { PhysicsBody } from './physics-body';
import type { RayDirection, RayOrigin } from './raycast';

const STEP_SECONDS = STEP_MS / 1000;

/** Quanto o animal fica parado pastando e quanto anda antes de parar de novo. */
const IDLE_MS = { min: 2000, max: 5000 } as const;
const WANDER_MS = { min: 1500, max: 4000 } as const;

/** Depois de um golpe, o animal corre para longe do herói, mais rápido que o passeio. */
const FLEE_MS = 3000;
const FLEE_SPEED_FACTOR = 1.8;

/** Quanto da velocidade desejada é alcançada por passo: o bicho acelera e freia macio. */
const GRIP = 0.3;

/** Na água, o animal bate as patas e boia, em vez de afundar. */
const SWIM_UP_SPEED = 2.5;

/** Distância à frente onde o animal sente o degrau ou a água. */
const PROBE_DISTANCE = 0.6;

/** Lugares sorteados para cada grupo antes de desistir até a próxima vez. */
const SPAWN_TRIES = 6;

/** O quanto os animais de um mesmo grupo nascem afastados entre si. */
const GROUP_SPREAD = 2;

/** Abaixo disto o animal saiu do mundo e some. */
const FALLOUT_Y = -8;

/** Um golpe joga o animal um pouco para cima, além de para trás. */
const KNOCKBACK_LIFT = 4;

export type CreatureMood = 'idle' | 'wander' | 'flee';

/** Um animal no mundo: corpo, vida, humor e o que ele ainda está esperando para repetir. */
export class Creature {
  readonly body: PhysicsBody;
  health: number;
  yaw: number;
  mood: CreatureMood = 'idle';
  moodLeftMs = 0;
  previousX: number;
  previousY: number;
  previousZ: number;
  /** Tempo até o próximo ovo; `null` para quem não bota nada. */
  layLeftMs: number | null;

  /** Espera de cada interação, pelo item usado (a lã crescendo de volta). */
  private readonly cooldowns = new Map<string, number>();

  constructor(
    readonly id: number,
    readonly definition: CreatureDefinition,
    x: number,
    y: number,
    z: number,
    yaw: number,
  ) {
    this.body = new PhysicsBody(x, y, z, definition.width / 2, definition.height);
    this.health = definition.health;
    this.yaw = yaw;
    this.previousX = x;
    this.previousY = y;
    this.previousZ = z;
    this.layLeftMs = definition.lays?.everyMs ?? null;
  }

  /** Alguma interação ainda está esperando: a ovelha tosquiada fica sem lã até lá. */
  get isCoolingDown(): boolean {
    return this.cooldowns.size > 0;
  }

  canUse(interaction: CreatureInteraction): boolean {
    return !this.cooldowns.has(interaction.item);
  }

  startCooldown(interaction: CreatureInteraction): void {
    if (interaction.cooldownMs > 0) {
      this.cooldowns.set(interaction.item, interaction.cooldownMs);
    }
  }

  tickCooldowns(elapsedMs: number): void {
    for (const [item, leftMs] of this.cooldowns) {
      if (leftMs <= elapsedMs) {
        this.cooldowns.delete(item);
      } else {
        this.cooldowns.set(item, leftMs - elapsedMs);
      }
    }
  }
}

export interface CreatureHit {
  readonly creature: Creature;
  readonly distance: number;
}

export interface CreaturesHost {
  /** Onde o herói está: os animais nascem longe dele e fogem dele. */
  hero(): { readonly x: number; readonly z: number };
  /** O animal soltou um item no chão (o ovo da galinha). */
  laid(creature: Creature, item: string): void;
}

/**
 * Os animais do mundo.
 *
 * Cada um vive numa máquina de estados pequena: parado pastando, passeando
 * numa direção ou fugindo de quem bateu nele. Novos animais nascem de tempos
 * em tempos fora da vista do herói, até o teto do mundo. Os inimigos e a
 * noite chegam com o combate; por enquanto só nascem os animais passivos.
 */
export class Creatures {
  private readonly creatures: Creature[] = [];
  private readonly spawnable: readonly (readonly [CreatureDefinition, number])[];
  private spawnLeftMs: number;
  private nextId = 1;

  constructor(
    private readonly world: VoxelWorld,
    private readonly catalog: CraftCatalog,
    private readonly properties: BlockProperties,
    private readonly random: SeededRandom,
    private readonly host: CreaturesHost,
  ) {
    this.spawnable = catalog.creatures
      .filter((creature) => creature.temperament === 'passive' && creature.spawn)
      .map((creature) => [creature, creature.spawn?.weight ?? 0] as const);
    this.spawnLeftMs = catalog.world.creatures.spawnIntervalMs;
  }

  get list(): readonly Creature[] {
    return this.creatures;
  }

  spawn(definition: CreatureDefinition, x: number, y: number, z: number): Creature {
    const creature = new Creature(this.nextId++, definition, x, y, z, this.random.next() * Math.PI * 2);

    this.startIdle(creature);
    this.creatures.push(creature);

    return creature;
  }

  remove(creature: Creature): void {
    const index = this.creatures.indexOf(creature);

    if (index >= 0) {
      this.creatures.splice(index, 1);
    }
  }

  step(terrain: PhysicsTerrain): void {
    this.spawnLeftMs -= STEP_MS;

    if (this.spawnLeftMs <= 0) {
      this.spawnLeftMs = this.catalog.world.creatures.spawnIntervalMs;
      this.spawnGroup();
    }

    for (let index = this.creatures.length - 1; index >= 0; index -= 1) {
      const creature = this.creatures[index];

      this.think(creature);
      this.move(terrain, creature);
      this.layEgg(creature);
      creature.tickCooldowns(STEP_MS);

      if (creature.body.y < FALLOUT_Y) {
        this.creatures.splice(index, 1);
      }
    }
  }

  /**
   * Um golpe: tira vida, empurra para longe de quem bateu e faz o animal
   * fugir. Devolve se ele foi derrotado — quem bate cuida do que ele solta.
   */
  hit(creature: Creature, damage: number, knockback: number, fromX: number, fromZ: number): boolean {
    const body = creature.body;
    const awayX = body.x - fromX;
    const awayZ = body.z - fromZ;
    const length = Math.hypot(awayX, awayZ) || 1;

    creature.health -= damage;

    if (creature.health <= 0) {
      this.remove(creature);
      return true;
    }

    body.velocityX = (awayX / length) * knockback;
    body.velocityZ = (awayZ / length) * knockback;
    body.velocityY = KNOCKBACK_LIFT;
    creature.yaw = Math.atan2(-awayX, -awayZ);
    creature.mood = 'flee';
    creature.moodLeftMs = FLEE_MS;

    return false;
  }

  /** Animal mais perto que o raio acerta, até `reach`. */
  castRay(origin: RayOrigin, direction: RayDirection, reach: number): CreatureHit | null {
    let nearest: CreatureHit | null = null;

    for (const creature of this.creatures) {
      const distance = rayBoxDistance(origin, direction, creature.body);

      if (distance !== null && distance <= reach && (!nearest || distance < nearest.distance)) {
        nearest = { creature, distance };
      }
    }

    return nearest;
  }

  private think(creature: Creature): void {
    creature.moodLeftMs -= STEP_MS;

    if (creature.moodLeftMs > 0) {
      if (creature.mood === 'flee') {
        const hero = this.host.hero();

        creature.yaw = Math.atan2(-(creature.body.x - hero.x), -(creature.body.z - hero.z));
      }
      return;
    }

    if (creature.mood === 'idle') {
      creature.mood = 'wander';
      creature.moodLeftMs = this.random.integer(WANDER_MS.min, WANDER_MS.max);
      creature.yaw = this.random.next() * Math.PI * 2;
    } else {
      this.startIdle(creature);
    }
  }

  private startIdle(creature: Creature): void {
    creature.mood = 'idle';
    creature.moodLeftMs = this.random.integer(IDLE_MS.min, IDLE_MS.max);
  }

  private move(terrain: PhysicsTerrain, creature: Creature): void {
    const body = creature.body;

    creature.previousX = body.x;
    creature.previousY = body.y;
    creature.previousZ = body.z;
    body.isInWater = body.touchesLiquid(terrain);

    let speed = creature.mood === 'idle' ? 0 : creature.definition.speed * (creature.mood === 'flee' ? FLEE_SPEED_FACTOR : 1);
    const directionX = -Math.sin(creature.yaw);
    const directionZ = -Math.cos(creature.yaw);

    // Animal que passeia não entra na água sozinho: para na beirada e dá meia-volta.
    if (speed > 0 && !body.isInWater && this.isWaterAhead(terrain, body, directionX, directionZ)) {
      creature.yaw += Math.PI;
      speed = 0;
    }

    if (body.isOnGround || body.isInWater) {
      body.velocityX += (directionX * speed - body.velocityX) * GRIP;
      body.velocityZ += (directionZ * speed - body.velocityZ) * GRIP;
    }

    if (body.isInWater) {
      body.velocityY = SWIM_UP_SPEED;
    } else {
      body.velocityY = Math.max(-HERO_PHYSICS.maxFallSpeed, body.velocityY - HERO_PHYSICS.gravity * STEP_SECONDS);
    }

    const result = body.move(terrain, body.velocityX * STEP_SECONDS, body.velocityY * STEP_SECONDS, body.velocityZ * STEP_SECONDS);

    if ((result.blockedX || result.blockedZ) && body.isOnGround && speed > 0) {
      if (body.collidesAt(terrain, directionX * PROBE_DISTANCE, 1.05, directionZ * PROBE_DISTANCE)) {
        creature.yaw += Math.PI / 2 + this.random.next() * Math.PI;
      } else {
        body.velocityY = HERO_PHYSICS.jumpSpeed;
      }
    }
  }

  private isWaterAhead(terrain: PhysicsTerrain, body: PhysicsBody, directionX: number, directionZ: number): boolean {
    const aheadX = Math.floor(body.x + directionX * (body.halfWidth + PROBE_DISTANCE));
    const aheadZ = Math.floor(body.z + directionZ * (body.halfWidth + PROBE_DISTANCE));
    const feetY = Math.floor(body.y);

    return terrain.isLiquid(aheadX, feetY, aheadZ) || terrain.isLiquid(aheadX, feetY - 1, aheadZ);
  }

  private layEgg(creature: Creature): void {
    const lays = creature.definition.lays;

    if (!lays || creature.layLeftMs === null) {
      return;
    }

    creature.layLeftMs -= STEP_MS;

    if (creature.layLeftMs <= 0) {
      creature.layLeftMs = lays.everyMs;
      this.host.laid(creature, lays.item);
    }
  }

  /** Sorteia um tipo de animal e tenta pôr um grupo dele no chão certo, longe do herói. */
  private spawnGroup(): void {
    const settings = this.catalog.world.creatures;
    const room = settings.passiveCap - this.creatures.length;

    if (room <= 0 || this.spawnable.length === 0) {
      return;
    }

    const definition = this.random.weighted(this.spawnable);
    const spawn = definition.spawn;

    if (!spawn) {
      return;
    }

    const ground = new Set(spawn.on.map((id) => this.catalog.blockNumber(id)));
    const hero = this.host.hero();

    for (let attempt = 0; attempt < SPAWN_TRIES; attempt += 1) {
      const angle = this.random.next() * Math.PI * 2;
      const distance = settings.minSpawnDistance + this.random.next() * (settings.maxSpawnDistance - settings.minSpawnDistance);
      const x = Math.floor(hero.x + Math.cos(angle) * distance);
      const z = Math.floor(hero.z + Math.sin(angle) * distance);

      if (this.standingY(x, z, ground) === null) {
        continue;
      }

      const size = Math.min(room, this.random.integer(spawn.groupMin, spawn.groupMax));

      for (let member = 0; member < size; member += 1) {
        const memberX = member === 0 ? x : x + this.random.integer(-GROUP_SPREAD, GROUP_SPREAD);
        const memberZ = member === 0 ? z : z + this.random.integer(-GROUP_SPREAD, GROUP_SPREAD);
        const y = this.standingY(memberX, memberZ, ground);

        if (y !== null) {
          this.spawn(definition, memberX + 0.5, y, memberZ + 0.5);
        }
      }
      return;
    }
  }

  /**
   * Altura onde um animal fica em pé na coluna: o chão mais alto tem que ser
   * de um dos blocos permitidos, com dois blocos livres em cima. Capim e flor
   * não contam como chão.
   */
  private standingY(x: number, z: number, ground: ReadonlySet<number>): number | null {
    const { world, properties } = this;

    if (x < 0 || z < 0 || x >= world.width || z >= world.depth) {
      return null;
    }

    for (let y = world.height - 1; y > 0; y -= 1) {
      const block = world.get(x, y, z);

      if (block === AIR || (properties.collisionHeight[block] === 0 && properties.isLiquid[block] === 0)) {
        continue;
      }

      const isClear = [1, 2].every((above) => {
        const cell = world.get(x, y + above, z);

        return properties.collisionHeight[cell] === 0 && properties.isLiquid[cell] === 0;
      });

      return ground.has(block) && isClear ? y + 1 : null;
    }

    return null;
  }
}

/** Distância até a caixa do corpo pelo raio (teste das placas); `null` se o raio não a cruza. */
function rayBoxDistance(origin: RayOrigin, direction: RayDirection, body: PhysicsBody): number | null {
  const min = [body.x - body.halfWidth, body.y, body.z - body.halfWidth];
  const max = [body.x + body.halfWidth, body.y + body.height, body.z + body.halfWidth];
  const start = [origin.x, origin.y, origin.z];
  const step = [direction.x, direction.y, direction.z];
  let near = 0;
  let far = Infinity;

  for (let axis = 0; axis < 3; axis += 1) {
    if (step[axis] === 0) {
      if (start[axis] < min[axis] || start[axis] > max[axis]) {
        return null;
      }
      continue;
    }

    const first = (min[axis] - start[axis]) / step[axis];
    const second = (max[axis] - start[axis]) / step[axis];

    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));

    if (near > far) {
      return null;
    }
  }

  return near;
}
