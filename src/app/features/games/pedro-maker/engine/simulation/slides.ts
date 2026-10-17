import { SLIDE_PHYSICS, TILE_SIZE } from '../../config/physics.config';
import type { LevelObject } from '../../models/level.model';
import { bottom, centerX, type PhysicsBody } from './physics-body';
import { COLLISION, type TileGrid } from './tile-grid';

/** Folga para contar como pouso na rampa: um pé que raspa nela já escorrega. */
const LANDING_TOLERANCE = 6;

/** Pertinho do fim a rampa já encontra o chão: ali o Pedro pisa, não escorrega. */
const EXIT_MARGIN = TILE_SIZE / 2;

/** Rampa de um escorregador, de cima para baixo, em pixels do mundo. */
export interface SlideRamp {
  readonly topX: number;
  readonly topY: number;
  readonly bottomX: number;
  readonly bottomY: number;
}

/**
 * Os escorregadores da fase.
 *
 * Cada um fica em pé sobre a célula em que foi colocado: a escada e o patamar
 * na coluna da peça, e a rampa descendo para a direita até o chão. O patamar
 * segura quem cai de cima, como uma nuvem; a rampa não é colisão nenhuma —
 * quem pousa nela passa a ser levado por ela (ver `Player.startSliding`).
 */
export class SlideSystem {
  readonly ramps: readonly SlideRamp[];

  constructor(objects: readonly LevelObject[], grid: TileGrid) {
    const slides = objects.filter((object) => object.type === 'slide');

    this.ramps = slides.map(rampOf);

    for (const slide of slides) {
      placeLanding(slide, grid);
    }
  }

  /**
   * Rampa em que o corpo pousou neste passo, se houver.
   *
   * Vale cruzar a rampa de cima para baixo entre o começo e o fim do passo:
   * quem passa por baixo dela ou pula através dela não é pego.
   */
  rampLandedOn(body: PhysicsBody): SlideRamp | null {
    if (body.vy < 0) {
      return null;
    }

    const x = centerX(body);
    const previousX = body.previousX + body.width / 2;
    const previousBottom = body.previousY + body.height;

    return (
      this.ramps.find(
        (ramp) =>
          x >= ramp.topX &&
          x <= ramp.bottomX - EXIT_MARGIN &&
          previousBottom <= rampSurfaceY(ramp, previousX) + LANDING_TOLERANCE &&
          bottom(body) >= rampSurfaceY(ramp, x) - LANDING_TOLERANCE,
      ) ?? null
    );
  }
}

/** Altura da rampa num ponto; fora dela, a altura da ponta mais próxima. */
export function rampSurfaceY(ramp: SlideRamp, x: number): number {
  const progress = Math.min(1, Math.max(0, (x - ramp.topX) / (ramp.bottomX - ramp.topX)));

  return ramp.topY + (ramp.bottomY - ramp.topY) * progress;
}

/** A peça é o pé da escada: o patamar fica no alto dela e a rampa começa ao lado. */
function rampOf(slide: LevelObject): SlideRamp {
  const groundY = (slide.y + 1) * TILE_SIZE;

  return {
    topX: (slide.x + 1) * TILE_SIZE,
    topY: groundY - SLIDE_PHYSICS.height * TILE_SIZE,
    bottomX: (slide.x + 1 + SLIDE_PHYSICS.length) * TILE_SIZE,
    bottomY: groundY,
  };
}

/** O patamar só ocupa uma célula vazia: nunca abre buraco num terreno que já estava ali. */
function placeLanding(slide: LevelObject, grid: TileGrid): void {
  const row = slide.y + 1 - SLIDE_PHYSICS.height;

  if (grid.collisionAt(slide.x, row) === COLLISION.empty) {
    grid.setCollision(slide.x, row, COLLISION.oneWay);
  }
}
