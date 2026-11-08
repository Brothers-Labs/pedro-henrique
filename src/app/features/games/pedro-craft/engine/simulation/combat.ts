import { STEP_MS } from '../../config/craft-physics.config';
import type { CraftCatalog } from '../../content/craft-catalog';
import { HAND_ATTACK_COOLDOWN_MS, HAND_DAMAGE, HAND_KNOCKBACK } from '../../content/parsers/parse-items';
import type { ExplosionSpec, ItemDefinition, RangedStats } from '../../models/content.model';
import type { PhysicsTerrain } from '../block-properties';
import { rollLoot } from './block-rules';
import type { Creature, Creatures } from './creatures';
import type { GoalEvent } from './goal-tracker';
import type { HeroHealth } from './hero-health';
import type { HeroMotion } from './hero-motion';
import type { ItemDrops } from './item-drops';
import type { PhysicsBody } from './physics-body';
import type { Projectiles } from './projectiles';
import type { SimulationEvent, VisualEvent } from './simulation-events';

/** O herói golpeado é empurrado para trás e um pouco para cima: sente o golpe sem perder o chão. */
const HERO_KNOCKBACK = 6;
const HERO_KNOCKBACK_LIFT = 4;

/** Empurrão da flecha do herói no bicho. */
const ARROW_KNOCKBACK = 3;

/** A flecha sai um pouco à frente dos olhos, para não nascer dentro da cabeça. */
const ARROW_MUZZLE = 0.4;

/** A explosão alcança um pouco além do raio dos blocos: quem está na beirada do buraco também sente. */
const BLAST_EDGE = 1;

/** Empurrão da explosão nos bichos: mais forte que um golpe de espada. */
const BLAST_KNOCKBACK = 8;

/** Os filhotes do slime nascem espalhados em volta de onde ele estava. */
const SPLIT_SPREAD = 0.4;

/** Cor da nuvem do inimigo que vai embora: fumaça clara, nada assustador. */
export const SMOKE_COLOR = '#e8e8f0';

export interface CombatContext {
  readonly catalog: CraftCatalog;
  readonly hero: HeroMotion;
  readonly health: HeroHealth;
  readonly creatures: Creatures;
  readonly projectiles: Projectiles;
  readonly drops: ItemDrops;
  readonly random: () => number;
  event(event: SimulationEvent): void;
  visual(event: VisualEvent): void;
  recordGoal(event: GoalEvent): void;
  /** Tira uma unidade da munição da mochila; devolve se havia. */
  takeAmmo(item: string): boolean;
  /** Gasta um uso do item da mão (a espada, o arco). */
  wearHeld(held: ItemDefinition): void;
  /** A vida acabou: o herói volta para casa. */
  fainted(): void;
  /** O herói não leva dano (modo Criativo). */
  isInvulnerable(): boolean;
  /** O escudo na mão segura a flecha (gastando um uso)? */
  blocksArrow(): boolean;
  /** Uma armadura na mochila segura o golpe (gastando um uso)? */
  absorbWithArmor(): boolean;
}

/** De onde veio o golpe: o escudo só segura flecha. */
export type HitSource = 'melee' | 'arrow';

/**
 * Golpes e flechas, nos dois sentidos.
 *
 * O herói golpeia o bicho mirado ou atira com o arco; os inimigos golpeiam
 * e atiram no herói. Separado da simulação para cada regra ficar pequena e
 * testável, como as ações nos blocos.
 */
export class Combat {
  private attackCooldownMs = 0;

  constructor(private readonly context: CombatContext) {}

  /** Passa o tempo do golpe e move as flechas, aplicando o que elas acertaram. */
  step(terrain: PhysicsTerrain): void {
    const { projectiles, hero, creatures } = this.context;

    this.attackCooldownMs = Math.max(0, this.attackCooldownMs - STEP_MS);

    for (const hit of projectiles.step(terrain, hero.body, creatures.list)) {
      const { projectile } = hit;
      const fromX = projectile.x - projectile.velocityX;
      const fromZ = projectile.z - projectile.velocityZ;

      if (hit.target === 'hero') {
        this.hurtHero(projectile.damage, fromX, fromZ, 'arrow');
      } else {
        this.strike(hit.creature, projectile.damage, ARROW_KNOCKBACK, fromX, fromZ);
      }
    }
  }

  /** O botão de golpear: o arco atira para onde se olha; o resto bate no bicho mirado. */
  swing(held: ItemDefinition | null, target: Creature | null): void {
    if (this.attackCooldownMs > 0) {
      return;
    }

    if (held?.ranged) {
      this.shoot(held, held.ranged);
      return;
    }

    if (!target) {
      return;
    }

    const body = this.context.hero.body;

    this.attackCooldownMs = held?.attackCooldownMs ?? HAND_ATTACK_COOLDOWN_MS;
    this.strike(target, held?.damage ?? HAND_DAMAGE, held?.knockback ?? HAND_KNOCKBACK, body.x, body.z);

    if (held?.kind === 'weapon') {
      this.context.wearHeld(held);
    }
  }

  /**
   * O herói leva um golpe vindo de (`fromX`, `fromZ`). O escudo segura a
   * flecha e a armadura segura o golpe: nos dois casos o herói é empurrado,
   * mas não perde coração.
   */
  hurtHero(amount: number, fromX: number, fromZ: number, source: HitSource = 'melee'): void {
    const { health, hero } = this.context;

    if (this.context.isInvulnerable() || !health.canBeHurt) {
      return;
    }

    if (source === 'arrow' && this.context.blocksArrow()) {
      health.protect();
      this.context.event({ type: 'sound', cue: 'button' });
      return;
    }

    const isAbsorbed = this.context.absorbWithArmor();

    if (isAbsorbed) {
      health.protect();
    } else if (!health.damage(amount)) {
      return;
    }

    const body = hero.body;
    const awayX = body.x - fromX;
    const awayZ = body.z - fromZ;
    const length = Math.hypot(awayX, awayZ) || 1;

    body.velocityX = (awayX / length) * HERO_KNOCKBACK;
    body.velocityZ = (awayZ / length) * HERO_KNOCKBACK;
    body.velocityY = HERO_KNOCKBACK_LIFT;

    if (isAbsorbed) {
      this.context.event({ type: 'sound', cue: 'enemyHit' });
      return;
    }

    this.context.event({ type: 'sound', cue: 'damage' });
    this.context.event({ type: 'hero-hurt' });

    if (health.isDepleted) {
      this.context.fainted();
    }
  }

  /**
   * A explosão em (`x`, `y`, `z`) machuca e empurra quem está perto: o dano
   * cai do centro para a beirada, e a beirada ainda tira um coração.
   */
  blast(x: number, y: number, z: number, explosion: ExplosionSpec): void {
    const reach = explosion.radius + BLAST_EDGE;
    const damageAt = (distance: number): number => Math.max(1, Math.ceil(explosion.damage * (1 - distance / reach)));
    const distanceTo = (body: PhysicsBody): number => Math.hypot(body.x - x, body.y + body.height / 2 - y, body.z - z);
    const heroDistance = distanceTo(this.context.hero.body);

    if (heroDistance < reach) {
      this.hurtHero(damageAt(heroDistance), x, z);
    }

    // Copia a lista: quem é derrotado sai dela (e o slime ainda se divide) no meio da volta.
    for (const creature of [...this.context.creatures.list]) {
      const distance = distanceTo(creature.body);

      if (distance < reach) {
        this.strike(creature, damageAt(distance), BLAST_KNOCKBACK, x, z);
      }
    }
  }

  /** O inimigo foi embora numa nuvem de fumaça, sem soltar nada. */
  vanish(creature: Creature): void {
    const body = creature.body;

    this.context.visual({ type: 'creature-poof', x: body.x, y: body.y, z: body.z, color: SMOKE_COLOR });
  }

  private strike(creature: Creature, damage: number, knockback: number, fromX: number, fromZ: number): void {
    this.context.event({ type: 'sound', cue: 'enemyHit' });

    if (this.context.creatures.hit(creature, damage, knockback, fromX, fromZ)) {
      this.defeat(creature);
    }
  }

  private shoot(held: ItemDefinition, ranged: RangedStats): void {
    const { hero, projectiles } = this.context;

    if (!this.context.takeAmmo(ranged.ammo)) {
      this.context.event({ type: 'hint', text: `${held.name}: faça flechas na mesa para atirar.` });
      return;
    }

    const direction = hero.lookDirection;
    const body = hero.body;

    this.attackCooldownMs = held.attackCooldownMs;
    projectiles.launch({
      owner: 'hero',
      damage: ranged.damage,
      x: body.x + direction.x * ARROW_MUZZLE,
      y: hero.eyeY + direction.y * ARROW_MUZZLE,
      z: body.z + direction.z * ARROW_MUZZLE,
      directionX: direction.x,
      directionY: direction.y,
      directionZ: direction.z,
      speed: ranged.speed,
    });
    this.context.event({ type: 'sound', cue: 'spring' });
    this.context.wearHeld(held);
  }

  /** O bicho derrotado vira uma nuvem, solta o que dá e, se for o slime, vira dois menores. */
  private defeat(creature: Creature): void {
    const { catalog, creatures, drops, random } = this.context;
    const { body, definition } = creature;

    if (definition.drops) {
      for (const entry of rollLoot(catalog.lootTable(definition.drops), random)) {
        drops.spawn(body.x, body.y + body.height / 2, body.z, { item: entry.item, count: entry.count, durability: null }, random);
      }
    }

    if (definition.splitInto) {
      const child = catalog.creature(definition.splitInto.creature);

      for (let index = 0; index < definition.splitInto.count; index += 1) {
        const offset = (index - (definition.splitInto.count - 1) / 2) * SPLIT_SPREAD * 2;

        creatures.spawn(child, body.x + offset, body.y, body.z + (random() - 0.5) * SPLIT_SPREAD).mood = 'chase';
      }
    }

    this.context.visual({ type: 'creature-poof', x: body.x, y: body.y, z: body.z, color: definition.colors[0] });
    this.context.recordGoal({ trigger: 'defeat', target: definition.id, count: 1 });
  }
}
