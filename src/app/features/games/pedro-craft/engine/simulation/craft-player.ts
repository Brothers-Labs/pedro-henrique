import type { HeroId } from '../../../pedro-maker/models/progress.model';
import type { CraftCatalog } from '../../content/craft-catalog';
import type { VoxelWorld } from '../../world/voxel-world';
import type { RayHit } from './raycast';
import type { Creature } from './creatures';
import { HeroEnergy } from './hero-energy';
import { HeroHealth } from './hero-health';
import { HeroMotion } from './hero-motion';
import { Inventory } from './inventory';
import type { DropCollector } from './item-drops';
import { Portals } from './portals';
import type { TrainRide } from './train-ride';

/** Onde o herói nasce e volta depois de desmaiar. */
export interface PlayerSpawn {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
}

/** Bloco sendo quebrado e quanto já foi. */
export interface PlayerMining {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  elapsedMs: number;
  readonly durationMs: number;
}

/**
 * Tudo o que é de um jogador só: o corpo e o olhar, a mochila, a vida, a
 * energia, a mira, o bloco sendo quebrado, o trem em que está e a cama onde
 * volta. O mundo, os bichos, os baús e o relógio são de todos.
 *
 * Com duas crianças na mesma tela, a simulação tem dois destes; cada uma
 * joga com o seu, e as duas veem o mesmo mundo.
 */
export class CraftPlayer {
  readonly motion: HeroMotion;
  readonly inventory: Inventory;
  readonly health: HeroHealth;
  /** A energia do modo Sobrevivência gentil; `null` nos outros modos. */
  readonly energy: HeroEnergy | null;
  /** O tempo parado dentro de um portal é de cada um: um entra, o outro fica. */
  readonly portalWalk: Portals;

  respawnPoint: PlayerSpawn;
  selectedSlot = 0;
  target: RayHit | null = null;
  targetCreature: Creature | null = null;
  mining: PlayerMining | null = null;
  ride: TrainRide | null = null;
  breakCooldownMs = 0;
  hintedCell = -1;
  /** Espera entre um golpe e outro, guardada enquanto o outro jogador joga. */
  attackCooldownMs = 0;
  /** O ímã dos itens caídos; a simulação liga depois de criar o jogador. */
  collector: DropCollector | null = null;

  constructor(
    /** 0 para o Jogador 1, 1 para o Jogador 2. */
    readonly index: number,
    /** Herói do Pedro Maker que este jogador veste. */
    readonly heroId: HeroId,
    spawn: PlayerSpawn,
    catalog: CraftCatalog,
    world: VoxelWorld,
    hasEnergy: boolean,
  ) {
    this.motion = new HeroMotion(spawn.x, spawn.y, spawn.z, spawn.yaw);
    this.respawnPoint = spawn;
    this.inventory = new Inventory(catalog);
    this.health = new HeroHealth(catalog.world.hero);
    this.energy = hasEnergy ? new HeroEnergy(catalog.world.hero.energy) : null;
    this.portalWalk = new Portals(world, catalog);
  }
}
