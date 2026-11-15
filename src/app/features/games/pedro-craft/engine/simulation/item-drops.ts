import { STEP_MS } from '../../config/craft-physics.config';
import type { PhysicsTerrain } from '../block-properties';
import type { ItemStack } from './inventory';
import { PhysicsBody } from './physics-body';

const STEP_SECONDS = STEP_MS / 1000;
const GRAVITY = 20;
const HALF_SIZE = 0.125;

/** O item recém-caído espera um pouco antes de ser recolhido: dá tempo de ver ele pular. */
const PICKUP_DELAY_MS = 350;

/** A partir desta distância o item voa até o herói, como um ímã. */
const MAGNET_RANGE = 2.4;
const MAGNET_SPEED = 7;

/** Perto assim, o item entra na mochila. */
const PICKUP_RANGE = 0.9;

/** Item esquecido no chão some depois de cinco minutos, para o mundo não encher. */
const LIFETIME_MS = 5 * 60 * 1000;

export interface ItemDrop {
  readonly id: number;
  readonly body: PhysicsBody;
  stack: ItemStack;
  ageMs: number;
}

/** Quem recolhe: o centro do herói e o quanto cabe de cada item. */
export interface DropCollector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  roomFor(item: string): number;
  /** Guarda a pilha; devolve quanto não coube. */
  collect(stack: ItemStack): number;
}

/**
 * Itens soltos no chão: o que cai do bloco quebrado e da criatura derrotada.
 *
 * Pulam um pouco ao nascer, caem com a física de sempre e voam até o herói
 * quando ele chega perto e tem espaço na mochila. Mochila cheia: o item
 * espera no chão.
 */
export class ItemDrops {
  private readonly drops: ItemDrop[] = [];
  private nextId = 1;

  get list(): readonly ItemDrop[] {
    return this.drops;
  }

  spawn(x: number, y: number, z: number, stack: ItemStack, random: () => number): void {
    const body = new PhysicsBody(x, y, z, HALF_SIZE, HALF_SIZE * 2);

    body.velocityX = (random() - 0.5) * 2.4;
    body.velocityY = 3 + random() * 1.5;
    body.velocityZ = (random() - 0.5) * 2.4;
    this.drops.push({ id: this.nextId++, body, stack, ageMs: 0 });
  }

  /** Com dois jogadores, cada item vai para quem está mais perto e tem espaço na mochila. */
  step(terrain: PhysicsTerrain, collectors: DropCollector | readonly DropCollector[]): void {
    const candidates: readonly DropCollector[] = Array.isArray(collectors) ? collectors : [collectors as DropCollector];

    for (let index = this.drops.length - 1; index >= 0; index -= 1) {
      const drop = this.drops[index];
      const body = drop.body;
      const collector = nearestWithRoom(candidates, body, drop.stack.item);

      drop.ageMs += STEP_MS;

      if (drop.ageMs > LIFETIME_MS) {
        this.drops.splice(index, 1);
        continue;
      }

      const distance = Math.hypot(collector.x - body.x, collector.y - body.y, collector.z - body.z);
      const isAttracted = drop.ageMs > PICKUP_DELAY_MS && distance < MAGNET_RANGE && collector.roomFor(drop.stack.item) > 0;

      if (isAttracted && distance < PICKUP_RANGE) {
        const left = collector.collect(drop.stack);

        if (left === 0) {
          this.drops.splice(index, 1);
          continue;
        }

        drop.stack = { ...drop.stack, count: left };
      }

      if (isAttracted) {
        // Voando para o herói, o item atravessa tudo: um ímã não esbarra na grama.
        body.x += ((collector.x - body.x) / distance) * MAGNET_SPEED * STEP_SECONDS;
        body.y += ((collector.y - body.y) / distance) * MAGNET_SPEED * STEP_SECONDS;
        body.z += ((collector.z - body.z) / distance) * MAGNET_SPEED * STEP_SECONDS;
        continue;
      }

      body.velocityY = Math.max(-20, body.velocityY - GRAVITY * STEP_SECONDS);

      if (body.isOnGround) {
        body.velocityX *= 0.8;
        body.velocityZ *= 0.8;
      }

      body.move(terrain, body.velocityX * STEP_SECONDS, body.velocityY * STEP_SECONDS, body.velocityZ * STEP_SECONDS);
    }
  }
}

/** O jogador mais perto que ainda tem espaço para o item; sem nenhum com espaço, o mais perto. */
function nearestWithRoom(collectors: readonly DropCollector[], body: { readonly x: number; readonly y: number; readonly z: number }, item: string): DropCollector {
  const distance = (collector: DropCollector): number => Math.hypot(collector.x - body.x, collector.y - body.y, collector.z - body.z);
  const byDistance = [...collectors].sort((first, second) => distance(first) - distance(second));

  return byDistance.find((collector) => collector.roomFor(item) > 0) ?? byDistance[0];
}
