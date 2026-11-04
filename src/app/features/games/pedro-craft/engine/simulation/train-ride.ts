import type { VoxelWorld } from '../../world/voxel-world';
import type { BlockProperties } from '../block-properties';
import { isRail, type RailDirection, railConnections } from '../rails';

/** No fim da linha, o trem para um pouquinho antes de voltar: dá tempo de a criança perceber. */
export const END_OF_LINE_PAUSE_MS = 1200;

/** Altura do assento acima do bloco do trilho, a partir dos pés do herói. */
export const TRAIN_SEAT_HEIGHT = 0.25;

/** Na encruzilhada, empate no olhar fica com o caminho reto. */
const STRAIGHT_BONUS = 0.01;

/**
 * Um passeio de trem: o trem anda sozinho de centro em centro de trilho.
 *
 * Nas curvas ele vira; na encruzilhada, segue para o lado que o herói está
 * olhando; no fim da linha, espera e volta. Não usa física: o trem só existe
 * em cima do trilho, então não cai, não atola e não prende ninguém.
 */
export class TrainRide {
  /** Altura do trilho: o trem anda no plano, sem subir nem descer. */
  readonly y: number;
  x: number;
  z: number;
  previousX: number;
  previousZ: number;
  /** Para onde a frente do trem aponta, no mesmo jeito de medir do olhar do herói. */
  yaw: number;

  private fromX: number;
  private fromZ: number;
  private toX: number;
  private toZ: number;
  private progress = 0;
  private waitMs = 0;

  private constructor(
    private readonly world: VoxelWorld,
    private readonly properties: BlockProperties,
    private readonly speed: number,
    x: number,
    y: number,
    z: number,
    lookYaw: number,
  ) {
    this.y = y;
    this.fromX = x;
    this.fromZ = z;
    this.toX = x;
    this.toZ = z;
    this.x = x + 0.5;
    this.z = z + 0.5;
    this.previousX = this.x;
    this.previousZ = this.z;
    this.yaw = lookYaw;
    this.depart(lookYaw, null);
  }

  /** Sobe no trem no trilho da célula; `null` quando ali não tem trilho com espaço para o herói. */
  static board(
    world: VoxelWorld,
    properties: BlockProperties,
    cell: { readonly x: number; readonly y: number; readonly z: number },
    speed: number,
    lookYaw: number,
  ): TrainRide | null {
    const ride = new TrainRide(world, properties, speed, cell.x, cell.y, cell.z, lookYaw);

    return ride.canStandOn(cell.x, cell.z) ? ride : null;
  }

  /** Onde ficam os pés do herói sentado. */
  get seatY(): number {
    return this.y + TRAIN_SEAT_HEIGHT;
  }

  get isStopped(): boolean {
    return this.fromX === this.toX && this.fromZ === this.toZ;
  }

  /**
   * Um passo do passeio. Devolve `false` quando o trilho embaixo do trem
   * sumiu (alguém quebrou): o passeio acaba e o herói desce ali mesmo.
   */
  step(elapsedMs: number, lookYaw: number): boolean {
    this.previousX = this.x;
    this.previousZ = this.z;

    if (!this.keepOnTrack()) {
      return false;
    }

    if (this.isStopped) {
      this.waitAtEndOfLine(elapsedMs, lookYaw);
    } else {
      this.advance((this.speed * elapsedMs) / 1000, lookYaw);
    }

    this.x = this.fromX + 0.5 + (this.toX - this.fromX) * this.progress;
    this.z = this.fromZ + 0.5 + (this.toZ - this.fromZ) * this.progress;

    return true;
  }

  /** O trilho da frente sumiu: o trem volta para o de trás. Sumiram os dois: acabou. */
  private keepOnTrack(): boolean {
    if (this.canStandOn(this.toX, this.toZ)) {
      return true;
    }

    if (!this.canStandOn(this.fromX, this.fromZ)) {
      return false;
    }

    [this.fromX, this.fromZ, this.toX, this.toZ] = [this.toX, this.toZ, this.fromX, this.fromZ];
    this.progress = 1 - this.progress;
    this.yaw += Math.PI;

    return true;
  }

  private waitAtEndOfLine(elapsedMs: number, lookYaw: number): void {
    this.waitMs -= elapsedMs;

    if (this.waitMs <= 0) {
      this.depart(lookYaw, null);
    }
  }

  private advance(distance: number, lookYaw: number): void {
    let left = distance;

    while (left > 0 && !this.isStopped) {
      const remaining = 1 - this.progress;

      if (left < remaining) {
        this.progress += left;
        return;
      }

      left -= remaining;
      this.arrive(lookYaw);
    }
  }

  /** Chegou ao centro do próximo trilho: escolhe para onde seguir, sem voltar pelo caminho de onde veio. */
  private arrive(lookYaw: number): void {
    const heading: RailDirection = { dx: this.toX - this.fromX, dz: this.toZ - this.fromZ };

    this.fromX = this.toX;
    this.fromZ = this.toZ;
    this.progress = 0;
    this.depart(lookYaw, heading);
  }

  /** Sai do trilho atual; sem saída, fica parado esperando para tentar de novo (e aí pode voltar). */
  private depart(lookYaw: number, heading: RailDirection | null): void {
    const next = this.chooseExit(lookYaw, heading);

    if (!next) {
      this.toX = this.fromX;
      this.toZ = this.fromZ;
      this.waitMs = END_OF_LINE_PAUSE_MS;
      return;
    }

    this.toX = this.fromX + next.dx;
    this.toZ = this.fromZ + next.dz;
    this.yaw = Math.atan2(-next.dx, -next.dz);
  }

  private chooseExit(lookYaw: number, heading: RailDirection | null): RailDirection | null {
    const lookX = -Math.sin(lookYaw);
    const lookZ = -Math.cos(lookYaw);
    const exits = railConnections(this.world, this.properties, this.fromX, this.y, this.fromZ).filter(
      (exit) =>
        this.canStandOn(this.fromX + exit.dx, this.fromZ + exit.dz) &&
        !(heading && exit.dx === -heading.dx && exit.dz === -heading.dz),
    );
    const score = (exit: RailDirection): number =>
      exit.dx * lookX + exit.dz * lookZ + (heading && exit.dx === heading.dx && exit.dz === heading.dz ? STRAIGHT_BONUS : 0);

    return exits.reduce<RailDirection | null>((best, exit) => (best === null || score(exit) > score(best) ? exit : best), null);
  }

  /** Tem trilho na célula e espaço livre em cima para o herói sentado. */
  private canStandOn(x: number, z: number): boolean {
    return isRail(this.world, this.properties, x, this.y, z) && this.properties.collisionHeight[this.world.get(x, this.y + 1, z)] === 0;
  }
}
