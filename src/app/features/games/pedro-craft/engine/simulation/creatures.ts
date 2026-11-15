import type { SeededRandom } from '../../../pedro-maker/levels/seeded-random';
import { HERO_PHYSICS, STEP_MS } from '../../config/craft-physics.config';
import type { CraftCatalog } from '../../content/craft-catalog';
import type { CreatureDefinition, CreatureInteraction, ExplosionSpec, SpawnPeriod, Temperament } from '../../models/content.model';
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

/** Perto assim, o creeper para e começa a chiar; longe assim, o herói escapou e o pavio apaga. */
const FUSE_START_RANGE = 2.5;
const FUSE_ESCAPE_RANGE = 5;

/** Perto assim do golem, um inimigo vira alvo dele. */
const GUARD_RANGE = 12;

/** Longe assim do herói, o golem vai atrás dele; perto assim, para e fica de guarda. */
const FOLLOW_START_RANGE = 8;
const FOLLOW_STOP_RANGE = 3;

/** Amigos chamados de uma vez: golem demais lotaria a casa e esconderia os inimigos. */
export const GUARDIAN_CAP = 3;

/** Bichos mansos de cada tipo chamados pela mochila do Criativo: no Criativo o item não acaba, e o mundo não pode lotar. */
export const TAME_CAP = 5;

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

/** Quanto tempo o animal alimentado fica procurando par para ter filhote. */
const LOVE_MS = 30_000;

/** Distância em que dois animais apaixonados se encontram. */
const LOVE_RANGE = 8;

/** Depois de um filhote, o casal descansa este tanto antes de outro. */
const BREED_REST_MS = 5 * 60 * 1000;

/** Teto de animais com os filhotes: o dobro do que nasce sozinho, para o mundo não lotar. */
const BREED_CAP_FACTOR = 2;

/** `follow` é o golem indo atrás do herói; `chase` é ir atrás de quem se quer golpear. */
export type CreatureMood = 'idle' | 'wander' | 'flee' | 'chase' | 'follow';

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
  /** Filhote enquanto for maior que zero: o tempo que falta para crescer. */
  growLeftMs = 0;
  /** Alimentado e procurando par. */
  loveLeftMs = 0;
  /** Descanso depois de ter um filhote. */
  breedRestMs = 0;
  /** Pavio aceso do creeper: quanto falta para estourar; `null` apagado. */
  fuseLeftMs: number | null = null;
  /** Duração do pavio aceso agora, para o desenho saber quanto já queimou. */
  fuseTotalMs = 0;
  /** O inimigo que o golem está enfrentando; `null` sem nenhum por perto. */
  foe: Creature | null = null;
  /**
   * Chamada pela mochila do Criativo: mesmo a Falsity e o Cruelty passeiam
   * como amigos, sem ir atrás do herói nem voltar para casa com o sol.
   */
  isTame = false;
  /** Tempo até a criatura poder falar de novo: tocar sem parar não vira um coro. */
  greetLeftMs = 0;

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
    return this.definition.temperament === 'hostile' && !this.isTame;
  }

  /** O amigo chamado pela criança: protege o herói e não leva golpe dele. */
  get isGuardian(): boolean {
    return this.definition.temperament === 'guardian';
  }

  get isBaby(): boolean {
    return this.growLeftMs > 0;
  }

  /** Pode comer para ter filhote agora? Precisa ser adulto, sem estar descansando nem já apaixonado. */
  get canBreed(): boolean {
    return this.definition.breedsWith !== null && !this.isBaby && this.loveLeftMs === 0 && this.breedRestMs === 0;
  }

  /** Quanto do pavio já queimou, de 0 a 1; 0 com o pavio apagado. */
  get fuseProgress(): number {
    return this.fuseLeftMs === null || this.fuseTotalMs === 0 ? 0 : 1 - this.fuseLeftMs / this.fuseTotalMs;
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
    this.growLeftMs = Math.max(0, this.growLeftMs - elapsedMs);
    this.loveLeftMs = Math.max(0, this.loveLeftMs - elapsedMs);
    this.breedRestMs = Math.max(0, this.breedRestMs - elapsedMs);
    this.greetLeftMs = Math.max(0, this.greetLeftMs - elapsedMs);

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

/** Quanto a dificuldade muda os inimigos: velocidade e espera entre golpes. */
export interface CreatureDifficulty {
  readonly speed: number;
  readonly attackCooldown: number;
}

export interface CreaturesHost {
  /** O corpo do herói (o Jogador 1): os bichos nascem longe dele e o visitante chega perto dele. */
  hero(): PhysicsBody;
  /** O jogador mais perto de um ponto, de quem o bicho foge ou atrás de quem vai; sem isto, o herói. */
  heroNear?(x: number, z: number): PhysicsBody;
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
  /** Nasceu um filhote. */
  born(baby: Creature): void;
  /** No Fácil, os inimigos são mais lentos e atacam menos. */
  difficulty(): CreatureDifficulty;
  /** O creeper chegou perto e acendeu o pavio. */
  fuseLit(creature: Creature): void;
  /** O pavio acabou: o creeper já saiu da lista e o estouro acontece onde ele estava. */
  exploded(creature: Creature, explosion: ExplosionSpec): void;
  /** O golem alcançou um inimigo e deu um golpe nele. */
  defend(guardian: Creature, foe: Creature): void;
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
 *
 * O golem não nasce sozinho: a criança o chama. Ele acompanha o herói e vai
 * atrás do inimigo mais perto, de dia e de noite.
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

  /** Ainda cabe mais um golem? */
  get hasRoomForGuardian(): boolean {
    return this.creatures.filter((creature) => creature.isGuardian).length < GUARDIAN_CAP;
  }

  /** Ainda cabe mais um bicho manso deste tipo? */
  hasRoomForTame(definition: CreatureDefinition): boolean {
    return this.creatures.filter((creature) => creature.isTame && creature.definition.id === definition.id).length < TAME_CAP;
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

  /** Chama um visitante especial (o Rei Slime na lua cheia) para perto do herói, longe das tochas. */
  summon(definition: CreatureDefinition): Creature | null {
    const hero = this.host.hero();
    const position = this.spawner.placeNear(hero.x, hero.z);

    if (!position) {
      return null;
    }

    const creature = this.spawn(definition, position.x, position.y, position.z);

    creature.mood = 'chase';

    return creature;
  }

  /** O animal comeu a comida dele e vai procurar par. Devolve se ele aceitou a comida. */
  feed(creature: Creature): boolean {
    if (!creature.canBreed) {
      return false;
    }

    creature.loveLeftMs = LOVE_MS;
    this.findPartner(creature);

    return true;
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

    // Cópia, do último ao primeiro: o golpe do golem e o estouro do creeper tiram bichos da lista no meio da volta.
    for (const creature of [...this.creatures].reverse()) {
      if (!this.creatures.includes(creature)) {
        continue;
      }

      const body = creature.body;
      const hero = this.host.heroNear?.(body.x, body.z) ?? this.host.hero();

      this.think(creature, hero);
      this.move(terrain, creature, hero);

      const explosion = this.burnFuse(creature, hero);

      if (explosion) {
        this.remove(creature);
        this.host.exploded(creature, explosion);
        continue;
      }

      this.attack(creature, hero);
      this.layEgg(creature);
      creature.tickCooldowns(STEP_MS);

      const isLost = creature.isHostile && Math.hypot(body.x - hero.x, body.z - hero.z) > LEASH_RANGE;

      if (body.y < FALLOUT_Y || isLost) {
        this.remove(creature);
      }
    }
  }

  /**
   * Um golpe: tira vida e empurra para longe de quem bateu. O animal foge; o
   * inimigo fica bravo e vem atrás; o golem só é empurrado e segue na guarda.
   * Devolve se o bicho foi derrotado — quem bate cuida do que ele solta.
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

    if (creature.isGuardian) {
      return false;
    }

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

  /** Dois animais iguais e apaixonados, perto um do outro, têm um filhote entre eles. */
  private findPartner(creature: Creature): void {
    const partner = this.creatures.find(
      (other) =>
        other !== creature &&
        other.definition === creature.definition &&
        other.loveLeftMs > 0 &&
        distanceBetween(other.body, creature.body) <= LOVE_RANGE,
    );
    const passives = this.creatures.filter((other) => !other.isHostile).length;

    if (!partner || passives >= this.catalog.world.creatures.passiveCap * BREED_CAP_FACTOR) {
      return;
    }

    const baby = this.spawn(
      creature.definition,
      (creature.body.x + partner.body.x) / 2,
      Math.max(creature.body.y, partner.body.y),
      (creature.body.z + partner.body.z) / 2,
    );

    baby.growLeftMs = creature.definition.babyGrowMs;

    for (const parent of [creature, partner]) {
      parent.loveLeftMs = 0;
      parent.breedRestMs = BREED_REST_MS;
    }

    this.host.born(baby);
  }

  private think(creature: Creature, hero: PhysicsBody): void {
    if (creature.isGuardian && this.guard(creature, hero)) {
      return;
    }

    if (creature.isHostile && distanceBetween(creature.body, hero) < CHASE_RANGE) {
      creature.mood = 'chase';
      creature.yaw = yawTowards(creature.body, hero);
      return;
    }

    if (creature.mood === 'chase' || creature.mood === 'follow') {
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

  /**
   * O golem vai atrás do inimigo mais perto dele; sem inimigo, volta para
   * perto do herói. Devolve se decidiu para onde ir — senão, passeia por ali
   * como os animais.
   */
  private guard(guardian: Creature, hero: PhysicsBody): boolean {
    guardian.foe = this.nearestFoe(guardian);

    if (guardian.foe) {
      guardian.mood = 'chase';
      guardian.yaw = yawTowards(guardian.body, guardian.foe.body);
      return true;
    }

    const distance = distanceBetween(guardian.body, hero);
    const isFollowing = guardian.mood === 'follow' ? distance > FOLLOW_STOP_RANGE : distance > FOLLOW_START_RANGE;

    if (!isFollowing) {
      return false;
    }

    guardian.mood = 'follow';
    guardian.yaw = yawTowards(guardian.body, hero);

    return true;
  }

  private nearestFoe(guardian: Creature): Creature | null {
    let nearest: Creature | null = null;
    let nearestDistance = GUARD_RANGE;

    for (const other of this.creatures) {
      const distance = other.isHostile ? distanceBetween(guardian.body, other.body) : Infinity;

      if (distance < nearestDistance) {
        nearest = other;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  private startIdle(creature: Creature): void {
    creature.mood = 'idle';
    creature.moodLeftMs = this.random.integer(IDLE_MS.min, IDLE_MS.max);
  }

  /** Velocidade de andar neste passo; negativa é andar de costas (o esqueleto recuando). */
  private walkSpeed(creature: Creature, hero: PhysicsBody): number {
    const speed = creature.definition.speed * (creature.isHostile ? this.host.difficulty().speed : 1);

    if (creature.fuseLeftMs !== null) {
      return 0;
    }

    switch (creature.mood) {
      case 'idle':
        return 0;
      case 'flee':
        return speed * FLEE_SPEED_FACTOR;
      case 'wander':
      case 'follow':
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
      if (creature.mood === 'wander' || creature.mood === 'flee') {
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

  /**
   * O inimigo que alcançou o herói golpeia; o esqueleto atira de longe, se
   * enxerga o herói; o golem golpeia o inimigo que alcançou.
   */
  private attack(creature: Creature, hero: PhysicsBody): void {
    if (creature.mood !== 'chase' || creature.attackLeftMs > 0 || creature.definition.explodes) {
      return;
    }

    const definition = creature.definition;

    if (creature.isGuardian) {
      const foe = creature.foe;

      if (foe && this.creatures.includes(foe) && isWithinReach(creature.body, foe.body)) {
        creature.attackLeftMs = definition.attackCooldownMs;
        this.host.defend(creature, foe);
      }
      return;
    }

    if (definition.behavior === 'archer') {
      const distance = distanceBetween(creature.body, hero);

      if (distance <= ARCHER_SHOOT_RANGE && this.canSee(creature, hero)) {
        creature.attackLeftMs = definition.attackCooldownMs * this.host.difficulty().attackCooldown;
        this.host.shoot(this.aimAt(creature, hero));
      }
      return;
    }

    if (isWithinReach(creature.body, hero)) {
      creature.attackLeftMs = definition.attackCooldownMs * this.host.difficulty().attackCooldown;
      this.host.strike(creature);
    }
  }

  /**
   * O creeper não golpeia: perto do herói, para e acende o pavio. Se o herói
   * se afastar a tempo, o pavio apaga; senão, estoura. Devolve o estouro, ou
   * `null` enquanto não for a hora.
   */
  private burnFuse(creature: Creature, hero: PhysicsBody): ExplosionSpec | null {
    const explodes = creature.definition.explodes;

    if (!explodes) {
      return null;
    }

    const distance = distanceBetween(creature.body, hero);

    if (creature.fuseLeftMs === null) {
      if (creature.mood === 'chase' && distance <= FUSE_START_RANGE) {
        creature.fuseTotalMs = explodes.fuseMs * this.host.difficulty().attackCooldown;
        creature.fuseLeftMs = creature.fuseTotalMs;
        this.host.fuseLit(creature);
      }
      return null;
    }

    if (distance > FUSE_ESCAPE_RANGE) {
      creature.fuseLeftMs = null;
      return null;
    }

    creature.fuseLeftMs -= STEP_MS;

    return creature.fuseLeftMs <= 0 ? explodes : null;
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

    if (!lays || creature.layLeftMs === null || creature.isBaby) {
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
export function yawTowards(from: PhysicsBody, to: PhysicsBody): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

/** As duas caixas estão quase encostadas, na mesma altura mais ou menos? */
function isWithinReach(attacker: PhysicsBody, target: PhysicsBody): boolean {
  const gapX = Math.abs(target.x - attacker.x) - attacker.halfWidth - target.halfWidth;
  const gapZ = Math.abs(target.z - attacker.z) - attacker.halfWidth - target.halfWidth;
  const overlapsY = attacker.y < target.y + target.height && target.y < attacker.y + attacker.height + MELEE_GAP;

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
