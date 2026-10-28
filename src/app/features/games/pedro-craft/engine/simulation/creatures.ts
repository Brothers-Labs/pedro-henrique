import type { SeededRandom } from '../../../pedro-maker/levels/seeded-random';
import { HERO_PHYSICS, STEP_MS } from '../../config/craft-physics.config';
import type { CraftCatalog } from '../../content/craft-catalog';
import type { CreatureDefinition, CreatureInteraction, SpawnPeriod, Temperament } from '../../models/content.model';
import type { VoxelWorld } from '../../world/voxel-world';
import type { BlockProperties, PhysicsTerrain } from '../block-properties';
import { CreatureSpawner } from './creature-spawner';
import { PhysicsBody } from './physics-body';
import type { ProjectileLaunch } from './projectiles';
import { castRay, type RayDirection, type RayOrigin } from './raycast';

const STEP_SECONDS = STEP_MS / 1000;

/** Quanto o animal fica parado pastando e quanto anda antes de parar de novo. */
const IDLE_MS = { min: 2000, max: 5000 } as const;
const WANDER_MS = { min: 1500, max: 4000 } as const;

/** Depois de um golpe, o animal corre para longe do herói, mais rápido que o passeio. */
const FLEE_MS = 3000;
const FLEE_SPEED_FACTOR = 1.8;

/** Perto assim, o inimigo percebe o herói e vai atrás. */
const CHASE_RANGE = 16;

/** Longe assim do herói, o inimigo desiste do mundo e some, abrindo vaga para outro. */
const LEASH_RANGE = 48;

/** Folga entre a caixa do inimigo e a do herói para o golpe alcançar. */
const MELEE_GAP = 0.45;

/** O pulo do slime e da aranha: sobe e avança, e espera um pouco no chão. */
const HOP_SPEED = 6.5;
const HOP_REACH_FACTOR = 1.6;
const HOP_REST_MS = { min: 600, max: 1100 } as const;

/** O esqueleto gosta de distância: nem colado, nem longe demais para acertar. */
const ARCHER_MIN_DISTANCE = 5;
const ARCHER_MAX_DISTANCE = 10;
const ARCHER_SHOOT_RANGE = 14;
const ARCHER_ARROW_SPEED = 16;
/** A flecha cai assim, em blocos por segundo ao quadrado: o esqueleto mira um pouco acima para compensar. */
const ARROW_GRAVITY = 12;

/** Quanto da velocidade desejada é alcançada por passo: o bicho acelera e freia macio. */
const GRIP = 0.3;

/** Na água, o bicho bate as patas e boia, em vez de afundar. */
const SWIM_UP_SPEED = 2.5;

/** Distância à frente onde o bicho sente o degrau ou a água. */
const PROBE_DISTANCE = 0.6;

/** Abaixo disto o bicho saiu do mundo e some. */
const FALLOUT_Y = -8;

/** Um golpe joga o bicho um pouco para cima, além de para trás. */
const KNOCKBACK_LIFT = 4;

export type CreatureMood = 'idle' | 'wander' | 'flee' | 'chase';

/** Um bicho no mundo: corpo, vida, humor e o que ele ainda está esperando para repetir. */
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
  /** Tempo até poder golpear ou atirar de novo. */
  attackLeftMs = 0;
  /** Tempo de descanso no chão entre dois pulos. */
  hopLeftMs = 0;

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

  get isHostile(): boolean {
    return this.definition.temperament === 'hostile';
  }

  /** Alguma interação ainda está esperando: a ovelha tosquiada fica sem lã até lá. */
  get isCoolingDown(): boolean {
    return this.cooldowns.size > 0;
  }

  canUse(interaction: CreatureInteraction): boolean {
    return !this.cooldowns.has(interaction.item);
  }

  startCooldown(interaction: CreatureInteraction): void {
    this.setCooldown(interaction.item, interaction.cooldownMs);
  }

  /** Esperas em curso, para o save. */
  get cooldownList(): readonly { readonly item: string; readonly leftMs: number }[] {
    return [...this.cooldowns].map(([item, leftMs]) => ({ item, leftMs }));
  }

  /** Volta uma espera guardada (o save) ou começa uma nova; zero não espera nada. */
  setCooldown(item: string, leftMs: number): void {
    if (leftMs > 0) {
      this.cooldowns.set(item, leftMs);
    }
  }

  tickCooldowns(elapsedMs: number): void {
    this.attackLeftMs = Math.max(0, this.attackLeftMs - elapsedMs);
    this.hopLeftMs = Math.max(0, this.hopLeftMs - elapsedMs);

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
  /** O corpo do herói: os bichos nascem longe dele, fogem dele ou vão atrás dele. */
  hero(): PhysicsBody;
  /** Hora do dia para o sorteio de quem nasce. */
  period(): SpawnPeriod;
  /** Inimigos podem existir agora? Falso com o Modo Paz ligado. */
  allowsHostiles(): boolean;
  /** O bicho soltou um item no chão (o ovo da galinha). */
  laid(creature: Creature, item: string): void;
  /** O inimigo encostou no herói e deu um golpe. */
  strike(creature: Creature): void;
  /** O esqueleto atirou uma flecha. */
  shoot(launch: ProjectileLaunch): void;
  /** O inimigo foi embora numa nuvem de fumaça (o dia chegou, o Modo Paz ligou). */
  vanished(creature: Creature): void;
}

/**
 * Os bichos do mundo.
 *
 * Cada um vive numa máquina de estados pequena: parado, passeando, fugindo
 * de quem bateu nele ou, se for inimigo, indo atrás do herói. O jeito de ir
 * atrás vem do comportamento no JSON: o espantalho anda, o slime e a aranha
 * pulam e o esqueleto mantém distância e atira.
 *
 * Novos bichos nascem de tempos em tempos fora da vista do herói: os animais
 * de dia, os inimigos só à noite, longe das tochas, e nunca no Modo Paz. Ao
 * amanhecer os inimigos "voltam para casa" numa nuvem.
 */
export class Creatures {
  private readonly creatures: Creature[] = [];
  private readonly spawner: CreatureSpawner;
  private spawnLeftMs: number;
  private nextId = 1;

  constructor(
    private readonly world: VoxelWorld,
    private readonly catalog: CraftCatalog,
    private readonly properties: BlockProperties,
    private readonly random: SeededRandom,
    private readonly host: CreaturesHost,
  ) {
    this.spawner = new CreatureSpawner(world, catalog, properties, random);
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

  /** Todos os inimigos vão embora numa nuvem: amanheceu, o herói dormiu ou o Modo Paz ligou. */
  sendHostilesHome(): void {
    for (let index = this.creatures.length - 1; index >= 0; index -= 1) {
      const creature = this.creatures[index];

      if (creature.isHostile) {
        this.creatures.splice(index, 1);
        this.host.vanished(creature);
      }
    }
  }

  step(terrain: PhysicsTerrain): void {
    if (this.host.period() === 'day' || !this.host.allowsHostiles()) {
      this.sendHostilesHome();
    }

    this.spawnLeftMs -= STEP_MS;

    if (this.spawnLeftMs <= 0) {
      this.spawnLeftMs = this.catalog.world.creatures.spawnIntervalMs;
      this.spawnGroup();
    }

    const hero = this.host.hero();

    for (let index = this.creatures.length - 1; index >= 0; index -= 1) {
      const creature = this.creatures[index];
      const body = creature.body;

      this.think(creature, hero);
      this.move(terrain, creature, hero);
      this.attack(creature, hero);
      this.layEgg(creature);
      creature.tickCooldowns(STEP_MS);

      const isLost = creature.isHostile && Math.hypot(body.x - hero.x, body.z - hero.z) > LEASH_RANGE;

      if (body.y < FALLOUT_Y || isLost) {
        this.creatures.splice(index, 1);
      }
    }
  }

  /**
   * Um golpe: tira vida e empurra para longe de quem bateu. O animal foge; o
   * inimigo fica bravo e vem atrás. Devolve se o bicho foi derrotado — quem
   * bate cuida do que ele solta.
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

    if (creature.isHostile) {
      creature.mood = 'chase';
      creature.yaw = Math.atan2(awayX, awayZ);
    } else {
      creature.mood = 'flee';
      creature.moodLeftMs = FLEE_MS;
      creature.yaw = Math.atan2(-awayX, -awayZ);
    }

    return false;
  }

  /** Bicho mais perto que o raio acerta, até `reach`. */
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

  private think(creature: Creature, hero: PhysicsBody): void {
    if (creature.isHostile && distanceBetween(creature.body, hero) < CHASE_RANGE) {
      creature.mood = 'chase';
      creature.yaw = yawTowards(creature.body, hero);
      return;
    }

    if (creature.mood === 'chase') {
      this.startIdle(creature);
    }

    creature.moodLeftMs -= STEP_MS;

    if (creature.moodLeftMs > 0) {
      if (creature.mood === 'flee') {
        creature.yaw = yawTowards(hero, creature.body);
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

  /** Velocidade de andar neste passo; negativa é andar de costas (o esqueleto recuando). */
  private walkSpeed(creature: Creature, hero: PhysicsBody): number {
    const speed = creature.definition.speed;

    switch (creature.mood) {
      case 'idle':
        return 0;
      case 'flee':
        return speed * FLEE_SPEED_FACTOR;
      case 'wander':
        return speed;
      case 'chase': {
        if (creature.definition.behavior !== 'archer') {
          return speed;
        }

        const distance = distanceBetween(creature.body, hero);

        return distance > ARCHER_MAX_DISTANCE ? speed : distance < ARCHER_MIN_DISTANCE ? -speed : 0;
      }
    }
  }

  private move(terrain: PhysicsTerrain, creature: Creature, hero: PhysicsBody): void {
    const body = creature.body;

    creature.previousX = body.x;
    creature.previousY = body.y;
    creature.previousZ = body.z;
    body.isInWater = body.touchesLiquid(terrain);

    const isHopper = creature.definition.behavior === 'hopper';
    let speed = this.walkSpeed(creature, hero);
    const sign = Math.sign(speed);
    const directionX = -Math.sin(creature.yaw) * sign;
    const directionZ = -Math.cos(creature.yaw) * sign;

    speed = Math.abs(speed);

    // Ninguém entra na água sozinho: para na beirada e, se estava passeando, dá meia-volta.
    if (speed > 0 && !body.isInWater && this.isWaterAhead(terrain, body, directionX, directionZ)) {
      if (creature.mood !== 'chase') {
        creature.yaw += Math.PI;
      }
      speed = 0;
    }

    if (isHopper && body.isOnGround && !body.isInWater) {
      this.hop(creature, speed, directionX, directionZ);
    } else if (!isHopper && (body.isOnGround || body.isInWater)) {
      body.velocityX += (directionX * speed - body.velocityX) * GRIP;
      body.velocityZ += (directionZ * speed - body.velocityZ) * GRIP;
    }

    if (body.isInWater) {
      body.velocityY = SWIM_UP_SPEED;
    } else {
      body.velocityY = Math.max(-HERO_PHYSICS.maxFallSpeed, body.velocityY - HERO_PHYSICS.gravity * STEP_SECONDS);
    }

    const result = body.move(terrain, body.velocityX * STEP_SECONDS, body.velocityY * STEP_SECONDS, body.velocityZ * STEP_SECONDS);

    if ((result.blockedX || result.blockedZ) && body.isOnGround && speed > 0 && !isHopper) {
      if (body.collidesAt(terrain, directionX * PROBE_DISTANCE, 1.05, directionZ * PROBE_DISTANCE)) {
        creature.yaw += Math.PI / 2 + this.random.next() * Math.PI;
      } else {
        body.velocityY = HERO_PHYSICS.jumpSpeed;
      }
    }
  }

  /** No chão, quem pula freia; depois do descanso, salta para a frente. */
  private hop(creature: Creature, speed: number, directionX: number, directionZ: number): void {
    const body = creature.body;

    body.velocityX *= 1 - GRIP;
    body.velocityZ *= 1 - GRIP;

    if (speed === 0 || creature.hopLeftMs > 0) {
      return;
    }

    body.velocityX = directionX * speed * HOP_REACH_FACTOR;
    body.velocityZ = directionZ * speed * HOP_REACH_FACTOR;
    body.velocityY = HOP_SPEED;
    creature.hopLeftMs = this.random.integer(HOP_REST_MS.min, HOP_REST_MS.max);
  }

  /** O inimigo que alcançou o herói golpeia; o esqueleto atira de longe, se enxerga o herói. */
  private attack(creature: Creature, hero: PhysicsBody): void {
    if (creature.mood !== 'chase' || creature.attackLeftMs > 0) {
      return;
    }

    const definition = creature.definition;

    if (definition.behavior === 'archer') {
      const distance = distanceBetween(creature.body, hero);

      if (distance <= ARCHER_SHOOT_RANGE && this.canSee(creature, hero)) {
        creature.attackLeftMs = definition.attackCooldownMs;
        this.host.shoot(this.aimAt(creature, hero));
      }
      return;
    }

    if (isWithinReach(creature.body, hero)) {
      creature.attackLeftMs = definition.attackCooldownMs;
      this.host.strike(creature);
    }
  }

  /** Flecha do olho do esqueleto até o peito do herói, mirando um pouco acima pela queda da flecha. */
  private aimAt(creature: Creature, hero: PhysicsBody): ProjectileLaunch {
    const eye = eyeOf(creature.body);
    const deltaX = hero.x - eye.x;
    const deltaZ = hero.z - eye.z;
    const flat = Math.hypot(deltaX, deltaZ);
    const flightSeconds = flat / ARCHER_ARROW_SPEED;
    const deltaY = hero.y + hero.height * 0.6 - eye.y + 0.5 * ARROW_GRAVITY * flightSeconds * flightSeconds;
    const length = Math.hypot(deltaX, deltaY, deltaZ) || 1;

    return {
      owner: 'creature',
      damage: creature.definition.damage,
      x: eye.x,
      y: eye.y,
      z: eye.z,
      directionX: deltaX / length,
      directionY: deltaY / length,
      directionZ: deltaZ / length,
      speed: ARCHER_ARROW_SPEED,
    };
  }

  /** Nenhum bloco sólido entre o olho do bicho e o herói. */
  private canSee(creature: Creature, hero: PhysicsBody): boolean {
    const eye = eyeOf(creature.body);
    const deltaX = hero.x - eye.x;
    const deltaY = hero.y + hero.height * 0.8 - eye.y;
    const deltaZ = hero.z - eye.z;
    const distance = Math.hypot(deltaX, deltaY, deltaZ);
    const { world, properties } = this;

    if (distance === 0) {
      return true;
    }

    const blocker = castRay(
      eye,
      { x: deltaX / distance, y: deltaY / distance, z: deltaZ / distance },
      distance,
      (x, y, z) => properties.collisionHeight[world.get(x, y, z)] > 0,
    );

    return blocker === null;
  }

  private isWaterAhead(terrain: PhysicsTerrain, body: PhysicsBody, directionX: number, directionZ: number): boolean {
    const aheadX = Math.floor(body.x + directionX * (body.halfWidth + PROBE_DISTANCE));
    const aheadZ = Math.floor(body.z + directionZ * (body.halfWidth + PROBE_DISTANCE));
    const feetY = Math.floor(body.y);

    return terrain.isLiquid(aheadX, feetY, aheadZ) || terrain.isLiquid(aheadX, feetY - 1, aheadZ);
  }

  private spawnGroup(): void {
    const hero = this.host.hero();
    const group = this.spawner.pick({
      period: this.host.period(),
      allowsHostiles: this.host.allowsHostiles(),
      heroX: hero.x,
      heroZ: hero.z,
      roomFor: (temperament) => this.roomFor(temperament),
    });

    if (!group) {
      return;
    }

    for (const position of group.positions) {
      this.spawn(group.definition, position.x, position.y, position.z);
    }
  }

  private roomFor(temperament: Temperament): number {
    const settings = this.catalog.world.creatures;
    const cap = temperament === 'hostile' ? settings.hostileCap : settings.passiveCap;

    return cap - this.creatures.filter((creature) => creature.definition.temperament === temperament).length;
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

}

function distanceBetween(from: PhysicsBody, to: PhysicsBody): number {
  return Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
}

/** Ângulo para olhar de `from` até `to`, no mesmo sentido do olhar do herói (frente é -z). */
function yawTowards(from: PhysicsBody, to: PhysicsBody): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

/** As duas caixas estão quase encostadas, na mesma altura mais ou menos? */
function isWithinReach(creature: PhysicsBody, hero: PhysicsBody): boolean {
  const gapX = Math.abs(hero.x - creature.x) - creature.halfWidth - hero.halfWidth;
  const gapZ = Math.abs(hero.z - creature.z) - creature.halfWidth - hero.halfWidth;
  const overlapsY = creature.y < hero.y + hero.height && hero.y < creature.y + creature.height + MELEE_GAP;

  return gapX < MELEE_GAP && gapZ < MELEE_GAP && overlapsY;
}

function eyeOf(body: PhysicsBody): RayOrigin {
  return { x: body.x, y: body.y + body.height * 0.85, z: body.z };
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
