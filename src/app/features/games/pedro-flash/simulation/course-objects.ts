import { laneOffset, LANE_WIDTH, type Course } from '../course/course-geometry';
import type { CoursePiece } from '../models/course.model';
import { RUNNER_PHYSICS } from './runner';

/** Altura dos raios soltos na pista: na cintura de quem corre. */
const RAIO_HEIGHT = 1.1;
/** Uma fileira de raios ocupa a casa, de um raio a cada três metros. */
const RAIO_ROW_OFFSETS: readonly number[] = [-6, -3, 0, 3, 6];
const LOOP_RAIOS = 9;
/** Velocidade de referência para desenhar o arco de raios acima da mola. */
const ARC_REFERENCE_SPEED = 34;
const ARC_FRACTIONS: readonly number[] = [0.25, 0.5, 0.75];

export const ITEM_BOX_HEIGHT = 1.2;

export interface RaioPickup {
  readonly distance: number;
  readonly lateral: number;
  readonly height: number;
  /** Quando foi pego; `null` enquanto estiver na pista. */
  collectedAtMs: number | null;
}

export interface ItemBox {
  readonly distance: number;
  readonly lateral: number;
  /** Momento em que a caixa volta; zero quando ela está na pista. */
  respawnAtMs: number;
}

export type HazardKind = 'espinhos' | 'barreira';

export interface Hazard {
  readonly kind: HazardKind;
  readonly distance: number;
  readonly lateral: number;
  /** A barreira quebra quando alguém atravessa; os espinhos nunca. */
  brokenAtMs: number | null;
}

export type PadKind = 'mola' | 'turbo' | 'rampa';

export interface Pad {
  readonly kind: PadKind;
  readonly distance: number;
}

export type EnemyKind = 'besouro' | 'abelha' | 'tatu';

/** Medidas de cada robô para o encontrão: raio do corpo e altura do centro. */
export const ENEMY_SHAPES: Readonly<Record<EnemyKind, { readonly radius: number; readonly height: number }>> = {
  besouro: { radius: 1.0, height: 0.6 },
  abelha: { radius: 0.9, height: 2.3 },
  tatu: { radius: 0.9, height: 0.7 },
};

/** Distância à frente do Pedro em que o tatu acorda e começa a rolar. */
const TATU_WAKE_DISTANCE = 55;
const TATU_ROLL_SPEED = 12;
const BEETLE_PATROL_WIDTH = LANE_WIDTH * 0.85;

/**
 * Um robô do Doutor Apagão.
 *
 * Só o Pedro briga com os robôs: os corredores adversários passam por eles
 * como se não existissem, para a corrida não virar confusão.
 */
export class Enemy {
  distance: number;
  lateral: number;
  height: number;
  defeatedAtMs: number | null = null;
  isRolling = false;
  /** Fase da animação, para dois robôs iguais não andarem em sincronia. */
  readonly phase: number;

  constructor(
    readonly id: number,
    readonly kind: EnemyKind,
    readonly baseDistance: number,
    readonly baseLateral: number,
  ) {
    this.distance = baseDistance;
    this.lateral = baseLateral;
    this.height = ENEMY_SHAPES[kind].height;
    this.phase = id * 1.7;
  }

  get isDefeated(): boolean {
    return this.defeatedAtMs !== null;
  }

  /**
   * Um passo do robô.
   *
   * O besouro vai de um lado para o outro, a abelha flutua e o tatu, quando
   * o Pedro chega perto, vem rolando na direção dele.
   */
  update(clockSeconds: number, seconds: number, gapFromPlayer: number, speedFactor: number): void {
    if (this.isDefeated) {
      return;
    }

    switch (this.kind) {
      case 'besouro':
        this.lateral = clampLateral(this.baseLateral + BEETLE_PATROL_WIDTH * Math.sin(clockSeconds * 1.7 * speedFactor + this.phase));
        return;
      case 'abelha':
        this.height = ENEMY_SHAPES.abelha.height + 0.45 * Math.sin(clockSeconds * 2.4 + this.phase);
        this.lateral = clampLateral(this.baseLateral + 0.8 * Math.sin(clockSeconds * 1.1 + this.phase));
        return;
      case 'tatu':
        if (!this.isRolling && gapFromPlayer > 0 && gapFromPlayer < TATU_WAKE_DISTANCE) {
          this.isRolling = true;
        }

        if (this.isRolling) {
          this.distance -= TATU_ROLL_SPEED * speedFactor * seconds;
        }

        return;
    }
  }
}

/** Tudo o que a fase tem além da pista, já posto no lugar. */
export interface CourseObjects {
  readonly raios: readonly RaioPickup[];
  readonly itemBoxes: readonly ItemBox[];
  readonly hazards: readonly Hazard[];
  readonly pads: readonly Pad[];
  readonly enemies: readonly Enemy[];
}

/** Transforma as peças do caminho nos objetos da fase. */
export function createCourseObjects(course: Course): CourseObjects {
  const raios: RaioPickup[] = [];
  const itemBoxes: ItemBox[] = [];
  const hazards: Hazard[] = [];
  const pads: Pad[] = [];
  const enemies: Enemy[] = [];

  for (const piece of course.definition.pieces) {
    const distance = course.cellDistances[piece.cell];

    switch (piece.kind) {
      case 'raios':
        raios.push(...rowOfRaios(distance, piece));
        break;
      case 'loop':
        raios.push(...loopRaios(course, distance));
        break;
      case 'mola':
        pads.push({ kind: 'mola', distance });
        raios.push(...arcOfRaios(distance, RUNNER_PHYSICS.springSpeed));
        break;
      case 'turbo':
      case 'rampa':
        pads.push({ kind: piece.kind, distance });
        break;
      case 'caixa':
        itemBoxes.push(...([-1, 0, 1] as const).map((lane) => ({ distance, lateral: laneOffset(lane), respawnAtMs: 0 })));
        break;
      case 'espinhos':
      case 'barreira':
        hazards.push({ kind: piece.kind, distance, lateral: laneOffset(piece.lane), brokenAtMs: null });
        break;
      case 'besouro':
      case 'abelha':
      case 'tatu':
        enemies.push(new Enemy(enemies.length, piece.kind, distance, laneOffset(piece.lane)));
        break;
      case 'buraco':
        // O buraco é a falta de pista: quem cuida dele é a geometria.
        break;
    }
  }

  return { raios, itemBoxes, hazards, pads, enemies };
}

function rowOfRaios(distance: number, piece: CoursePiece): RaioPickup[] {
  return RAIO_ROW_OFFSETS.map((offset) => ({
    distance: distance + offset,
    lateral: laneOffset(piece.lane),
    height: RAIO_HEIGHT,
    collectedAtMs: null,
  }));
}

/** Raios espalhados pela volta do looping: quem passa por ele de cabeça para baixo junta todos. */
function loopRaios(course: Course, entry: number): RaioPickup[] {
  const loop = course.loops.find((candidate) => Math.abs(candidate.start - entry) < 0.01);

  if (!loop) {
    return [];
  }

  const spacing = (loop.end - loop.start) / (LOOP_RAIOS + 1);

  return Array.from({ length: LOOP_RAIOS }, (_, index) => ({
    distance: loop.start + spacing * (index + 1),
    lateral: 0,
    height: RAIO_HEIGHT,
    collectedAtMs: null,
  }));
}

/** Raios no arco que o salto da mola desenha, para premiar quem não desviou dela. */
function arcOfRaios(distance: number, verticalSpeed: number): RaioPickup[] {
  const airSeconds = (2 * verticalSpeed) / RUNNER_PHYSICS.gravity;

  return ARC_FRACTIONS.map((fraction) => {
    const seconds = airSeconds * fraction;

    return {
      distance: distance + ARC_REFERENCE_SPEED * seconds,
      lateral: 0,
      height: verticalSpeed * seconds - 0.5 * RUNNER_PHYSICS.gravity * seconds * seconds + RAIO_HEIGHT,
      collectedAtMs: null,
    };
  });
}

function clampLateral(lateral: number): number {
  const limit = LANE_WIDTH * 1.2;

  return Math.min(limit, Math.max(-limit, lateral));
}
