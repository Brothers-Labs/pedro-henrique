import { PHYSICS } from '../config/physics.config';
import { type LevelLayout, layoutLevel } from '../levels/level-layout';
import { type ControlState, directionOf } from '../models/controls.model';
import type { GridPoint, PedrereLevel } from '../models/level.model';
import type { AdventureResult, GameEvent } from '../models/scene.model';
import { overlaps, touchesTile } from './body';
import { HeroMotion } from './hero-motion';
import { Pebble } from './pebble';

export type AdventureStatus = 'jogando' | 'venceu' | 'perdeu';

/** O Pedro só machuca no espinho quando encosta na metade de baixo do bloco, onde ficam as pontas. */
const SPIKE_HEIGHT = 0.5;
/** Folga do pisão: um pouco abaixo do topo da pedrinha ainda conta como "em cima". */
const STOMP_TOLERANCE = 0.45;
const HURT_KNOCKBACK_SPEED = 8;
/** Moeda é generosa: encostar na borda já pega. */
const COIN_MARGIN = 0.15;

/**
 * Uma fase de aventura: correr, pular, pegar moedas e chegar na bandeira.
 *
 * Não sabe nada de tela: recebe os controles, anda um passo e conta o que
 * aconteceu. É isso que deixa as regras testáveis sem abrir um navegador.
 */
export class AdventureSimulation {
  readonly layout: LevelLayout;
  readonly hero: HeroMotion;
  readonly pebbles: readonly Pebble[];
  readonly totalCoins: number;

  status: AdventureStatus = 'jogando';
  hearts: number = PHYSICS.heroHearts;
  invulnerableLeft = 0;
  elapsedSeconds = 0;

  private readonly collectedCoins = new Set<number>();
  private respawn: GridPoint;
  private activeCheckpointIndex: number | null = null;

  constructor(level: PedrereLevel) {
    this.layout = layoutLevel(level);
    this.respawn = this.layout.start;
    this.hero = new HeroMotion(0, 0);
    this.pebbles = this.layout.pebbles.map((spawn) => new Pebble(spawn));
    this.totalCoins = this.layout.coins.length;
    this.placeHeroAt(this.layout.start);
  }

  get coins(): number {
    return this.collectedCoins.size;
  }

  get checkpointIndex(): number | null {
    return this.activeCheckpointIndex;
  }

  isCoinCollected(index: number): boolean {
    return this.collectedCoins.has(index);
  }

  step(controls: ControlState): readonly GameEvent[] {
    if (this.status !== 'jogando') {
      return [];
    }

    const seconds = PHYSICS.stepSeconds;
    const events: GameEvent[] = [];
    const terrainAt = this.layout.terrainAt;

    this.elapsedSeconds += seconds;
    this.invulnerableLeft = Math.max(0, this.invulnerableLeft - seconds);

    const motion = this.hero.step({ direction: directionOf(controls), isJumpHeld: controls.jump }, terrainAt, seconds);

    if (motion.didJump) {
      events.push('jump');
    }

    if (motion.didBounce) {
      events.push('bounce');
    }

    for (const pebble of this.pebbles) {
      pebble.step(terrainAt, seconds);
    }

    this.collectCoins(events);
    this.touchCheckpoints(events);
    this.meetPebbles(events);
    this.touchSpikes(events);
    this.checkFall(events);

    if (this.status === 'jogando' && touchesTile(this.hero.body, this.layout.goal)) {
      this.status = 'venceu';
      events.push('finish');
    }

    return events;
  }

  result(): AdventureResult | null {
    if (this.status === 'jogando') {
      return null;
    }

    const isVictory = this.status === 'venceu';

    return {
      mode: 'aventura',
      isVictory,
      coins: this.coins,
      totalCoins: this.totalCoins,
      stars: isVictory ? adventureStars(this.coins, this.totalCoins) : 0,
    };
  }

  private collectCoins(events: GameEvent[]): void {
    this.layout.coins.forEach((coin, index) => {
      if (!this.collectedCoins.has(index) && touchesTile(this.hero.body, coin, COIN_MARGIN)) {
        this.collectedCoins.add(index);
        events.push('coin');
      }
    });
  }

  private touchCheckpoints(events: GameEvent[]): void {
    this.layout.checkpoints.forEach((checkpoint, index) => {
      if (index !== this.activeCheckpointIndex && touchesTile(this.hero.body, checkpoint)) {
        this.activeCheckpointIndex = index;
        this.respawn = checkpoint;
        events.push('checkpoint');
      }
    });
  }

  private meetPebbles(events: GameEvent[]): void {
    const hero = this.hero.body;

    for (const pebble of this.pebbles) {
      if (!pebble.isActive || !overlaps(hero, pebble.body)) {
        continue;
      }

      const heroBottom = hero.y + hero.height;
      const isStomp = hero.vy > 0 && heroBottom - pebble.body.y < STOMP_TOLERANCE;

      if (isStomp) {
        pebble.squash();
        this.hero.launch(PHYSICS.stompBounceSpeed);
        events.push('stomp');
      } else {
        this.hurt(events);
      }
    }
  }

  private touchSpikes(events: GameEvent[]): void {
    const hero = this.hero.body;
    const firstColumn = Math.floor(hero.x);
    const lastColumn = Math.floor(hero.x + hero.width - 1e-6);
    const firstRow = Math.floor(hero.y);
    const lastRow = Math.floor(hero.y + hero.height - 1e-6);

    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const touchesPoints = hero.y + hero.height > row + 1 - SPIKE_HEIGHT;

        if (this.layout.terrainAt(column, row) === 'spike' && touchesPoints) {
          this.hurt(events);

          return;
        }
      }
    }
  }

  /** Cair no buraco custa uma vida e volta para o último marco, mesmo piscando. */
  private checkFall(events: GameEvent[]): void {
    if (this.hero.body.y <= this.layout.height + 1) {
      return;
    }

    events.push('fall');
    this.loseHeart();

    if (this.status === 'jogando') {
      this.placeHeroAt(this.respawn);
    }
  }

  private hurt(events: GameEvent[]): void {
    if (this.invulnerableLeft > 0) {
      return;
    }

    events.push('hurt');
    this.loseHeart();
    this.hero.launch(HURT_KNOCKBACK_SPEED);
  }

  private loseHeart(): void {
    this.hearts = Math.max(0, this.hearts - 1);
    this.invulnerableLeft = PHYSICS.invulnerableSeconds;

    if (this.hearts === 0) {
      this.status = 'perdeu';
    }
  }

  private placeHeroAt(point: GridPoint): void {
    this.hero.placeAt(point.column + (1 - PHYSICS.heroWidth) / 2, point.row + 1 - PHYSICS.heroHeight);
  }
}

/** Uma estrela por chegar, outra por metade das moedas e a terceira por todas. */
export function adventureStars(coins: number, totalCoins: number): number {
  if (totalCoins === 0) {
    return 3;
  }

  return 1 + (coins * 2 >= totalCoins ? 1 : 0) + (coins >= totalCoins ? 1 : 0);
}
