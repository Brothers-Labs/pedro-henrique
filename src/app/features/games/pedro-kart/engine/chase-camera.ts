import { MathUtils, type PerspectiveCamera, Vector3 } from 'three';

const DISTANCE_BEHIND = 7.5;
const HEIGHT = 3.4;
const LOOK_AHEAD = 5;
const LOOK_HEIGHT = 1.1;
const FOLLOW_RATE = 6;
const TURN_RATE = 5;

/**
 * Câmera que segue o kart por trás, como nos jogos de kart.
 *
 * Ela vira atrás do kart com um pouco de atraso — é isso que dá a sensação
 * de curva —, e não acompanha o rodopio da casca: quem escorregou continua
 * vendo para onde a pista vai.
 */
export class ChaseCamera {
  private readonly position = new Vector3();
  private readonly lookTarget = new Vector3();
  private heading = 0;
  private hasStarted = false;

  constructor(private readonly camera: PerspectiveCamera) {}

  /** Começa na frente do kart: na contagem, a câmera dá a volta até ficar atrás dele. */
  start(x: number, z: number, heading: number): void {
    this.heading = heading + Math.PI;
    this.position.set(x + Math.sin(heading) * 9, HEIGHT, z + Math.cos(heading) * 9);
    this.lookTarget.set(x, LOOK_HEIGHT, z);
    this.hasStarted = true;
    this.apply();
  }

  update(x: number, z: number, heading: number, isSpinning: boolean, deltaSeconds: number): void {
    if (!this.hasStarted) {
      this.start(x, z, heading);
    }

    if (!isSpinning) {
      const turn = Math.atan2(Math.sin(heading - this.heading), Math.cos(heading - this.heading));
      this.heading += turn * (1 - Math.exp(-TURN_RATE * deltaSeconds));
    }

    const blend = 1 - Math.exp(-FOLLOW_RATE * deltaSeconds);
    const desiredX = x - Math.sin(this.heading) * DISTANCE_BEHIND;
    const desiredZ = z - Math.cos(this.heading) * DISTANCE_BEHIND;

    this.position.set(
      MathUtils.lerp(this.position.x, desiredX, blend),
      MathUtils.lerp(this.position.y, HEIGHT, blend),
      MathUtils.lerp(this.position.z, desiredZ, blend),
    );
    this.lookTarget.set(x + Math.sin(this.heading) * LOOK_AHEAD, LOOK_HEIGHT, z + Math.cos(this.heading) * LOOK_AHEAD);
    this.apply();
  }

  private apply(): void {
    this.camera.position.copy(this.position);
    this.camera.lookAt(this.lookTarget);
  }
}
