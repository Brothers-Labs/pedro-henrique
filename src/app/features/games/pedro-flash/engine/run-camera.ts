import { MathUtils, type PerspectiveCamera, Vector3 } from 'three';

import { createFrame, sampleFrame, worldPoint, type Course } from '../course/course-geometry';

const DISTANCE_BEHIND = 8.5;
const HEIGHT = 3.4;
const LOOK_AHEAD = 7;
const LOOK_HEIGHT = 1.3;
/** A câmera acompanha só parte do desvio para o lado: a pista inteira continua na tela. */
const LATERAL_FOLLOW = 0.55;
const FOLLOW_RATE = 10;
const UP_RATE = 6;
const LOOK_RATE = 14;
const FOV_RATE = 4;
/** Quanto a abertura cresce embalado e no modo relâmpago: é o que dá a sensação de velocidade. */
const FOV_SPEED_KICK = 14;
const FOV_DASH_KICK = 8;
const INTRO_FRONT = 9;

export interface CameraTarget {
  readonly distance: number;
  readonly lateral: number;
  readonly height: number;
  /** Velocidade em relação à normal do tênis: 1 é a velocidade de cruzeiro. */
  readonly speedRatio: number;
  readonly isDashing: boolean;
}

/**
 * Câmera que segue o Pedro por trás e um pouco acima.
 *
 * O "em cima" dela é o "em cima" da pista: no looping ela gira junto, e a
 * criança vê o mundo de cabeça para baixo como o Pedro. Na contagem começa
 * na frente dele e dá a volta até ficar atrás.
 */
export class RunCamera {
  private readonly frame = createFrame();
  private readonly point = { x: 0, y: 0, z: 0 };
  private readonly position = new Vector3();
  private readonly desired = new Vector3();
  private readonly front = new Vector3();
  private readonly lookTarget = new Vector3();
  private readonly desiredLook = new Vector3();
  private hasLook = false;
  private readonly up = new Vector3(0, 1, 0);
  private readonly desiredUp = new Vector3();
  private hasStarted = false;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly course: Course,
  ) {}

  /** `introProgress` vai de 0 a 1 durante a contagem e fica em 1 depois da largada. */
  update(target: CameraTarget, introProgress: number, baseFov: number, deltaSeconds: number): void {
    const height = Math.max(0, target.height);

    this.behind(target, height);

    if (introProgress < 1) {
      this.blendWithFront(target, MathUtils.smootherstep(introProgress, 0, 1));
    }

    sampleFrame(this.course, target.distance, this.frame);
    this.desiredUp.set(this.frame.upX, this.frame.upY, this.frame.upZ);

    if (!this.hasStarted) {
      this.position.copy(this.desired);
      this.up.copy(this.desiredUp);
      this.hasStarted = true;
    }

    this.position.lerp(this.desired, 1 - Math.exp(-FOLLOW_RATE * deltaSeconds));
    this.up.lerp(this.desiredUp, 1 - Math.exp(-UP_RATE * deltaSeconds)).normalize();

    // Mira à frente na direção em que o Pedro corre (na contagem, nele mesmo):
    // mirar adiante na curva deixaria o Pedro na beirada da tela antes de cada virada.
    const ahead = LOOK_AHEAD * introProgress;

    worldPoint(this.frame, target.lateral * 0.75, LOOK_HEIGHT + height * 0.6, this.point);
    this.desiredLook.set(
      this.point.x + this.frame.tangentX * ahead,
      this.point.y + this.frame.tangentY * ahead,
      this.point.z + this.frame.tangentZ * ahead,
    );

    if (!this.hasLook) {
      this.lookTarget.copy(this.desiredLook);
      this.hasLook = true;
    }

    this.lookTarget.lerp(this.desiredLook, 1 - Math.exp(-LOOK_RATE * deltaSeconds));

    const kick = FOV_SPEED_KICK * MathUtils.clamp(target.speedRatio - 0.7, 0, 1) + (target.isDashing ? FOV_DASH_KICK : 0);
    const fov = MathUtils.lerp(this.camera.fov, baseFov + kick, 1 - Math.exp(-FOV_RATE * deltaSeconds));

    if (Math.abs(fov - this.camera.fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    this.camera.position.copy(this.position);
    this.camera.up.copy(this.up);
    this.camera.lookAt(this.lookTarget);
  }

  /**
   * Atrás do Pedro na direção em que ele corre, e não ao longo da pista.
   *
   * No looping, recuar pela própria curva levaria a câmera para perto do
   * centro da volta e o Pedro sairia da tela; recuando em linha reta ela fica
   * do lado de fora, com ele sempre no meio.
   */
  private behind(target: CameraTarget, height: number): void {
    sampleFrame(this.course, target.distance, this.frame);
    worldPoint(this.frame, target.lateral * LATERAL_FOLLOW, HEIGHT + height * 0.5, this.point);
    this.desired.set(
      this.point.x - this.frame.tangentX * DISTANCE_BEHIND,
      this.point.y - this.frame.tangentY * DISTANCE_BEHIND,
      this.point.z - this.frame.tangentZ * DISTANCE_BEHIND,
    );
  }

  private blendWithFront(target: CameraTarget, progress: number): void {
    sampleFrame(this.course, target.distance + INTRO_FRONT, this.frame);
    worldPoint(this.frame, target.lateral, 2.4, this.point);
    this.front.set(this.point.x, this.point.y, this.point.z);
    this.desired.lerp(this.front, 1 - progress);
  }
}
