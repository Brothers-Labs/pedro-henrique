import { MathUtils, type PerspectiveCamera } from 'three';

import type { ShakeIntensity } from '../simulation/visual-events';

/**
 * Altura visível, em blocos. Na tela de toque a câmera chega mais perto: num
 * celular deitado a tela tem pouca altura, e o Pedro não pode virar um pontinho.
 */
const VISIBLE_HEIGHT = { desktop: 13.5, touch: 11.5 } as const;

/** Largura mínima visível: no celular em pé, a fase não pode virar um corredor. */
const MIN_VISIBLE_WIDTH = 11;

/** Quanto a câmera se adianta na direção em que o Pedro olha. */
const LOOK_AHEAD = 2.9;

/** Folga em volta do Pedro dentro da qual a câmera não se mexe. */
const DEADZONE_X = 2;
const DEADZONE_Y = 1.5;

/** Câmera acima do alvo: olha levemente para baixo e mostra o topo dos blocos. */
const LIFT = 2.6;

/** Aproximação da câmera por segundo (quanto maior, mais grudada no Pedro). */
const FOLLOW_RATE = 7;

const SHAKES: Readonly<Record<ShakeIntensity, { readonly durationMs: number; readonly amplitude: number }>> = {
  leve: { durationMs: 140, amplitude: 0.07 },
  forte: { durationMs: 260, amplitude: 0.18 },
};

/**
 * A câmera que acompanha o Pedro.
 *
 * Segue com uma zona morta (andar um pouquinho não sacode a tela), adianta-se
 * para o lado em que ele olha e se inclina de leve na direção do movimento,
 * o que revela a lateral dos blocos e dá a sensação de profundidade. Nunca
 * mostra o que fica abaixo do fundo da fase.
 */
export class CameraRig {
  private focusX = 0;
  private focusY = 0;
  private lookAhead = 0;
  private zoom = 1;
  private targetZoom = 1;
  private shakeUntil = 0;
  private shakeAmplitude = 0;

  private readonly visibleHeight: number;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly levelWidth: number,
    isTouch: boolean,
  ) {
    this.visibleHeight = isTouch ? VISIBLE_HEIGHT.touch : VISIBLE_HEIGHT.desktop;
  }

  get x(): number {
    return this.focusX;
  }

  get y(): number {
    return this.focusY;
  }

  /** Vai direto para o alvo, sem deslizar: no começo da fase e depois de uma porta. */
  snapTo(targetX: number, targetY: number, facing: number): void {
    this.lookAhead = facing * LOOK_AHEAD;
    this.focusX = targetX + this.lookAhead;
    this.focusY = targetY;
    this.apply(0);
  }

  /** Aproxima para a luta com o chefão, que precisa de mais espaço na tela. */
  setZoom(zoom: number): void {
    this.targetZoom = zoom;
  }

  shake(intensity: ShakeIntensity, now: number): void {
    const shake = SHAKES[intensity];

    this.shakeUntil = Math.max(this.shakeUntil, now + shake.durationMs);
    this.shakeAmplitude = Math.max(this.shakeAmplitude, shake.amplitude);
  }

  update(deltaSeconds: number, now: number, targetX: number, targetY: number, facing: number): void {
    const blend = 1 - Math.exp(-FOLLOW_RATE * deltaSeconds);

    this.lookAhead = MathUtils.lerp(this.lookAhead, facing * LOOK_AHEAD, Math.min(1, deltaSeconds * 2.5));
    this.zoom = MathUtils.lerp(this.zoom, this.targetZoom, blend * 0.5);

    const wantedX = targetX + this.lookAhead;

    if (Math.abs(wantedX - this.focusX) > DEADZONE_X) {
      this.focusX = MathUtils.lerp(this.focusX, wantedX - Math.sign(wantedX - this.focusX) * DEADZONE_X, blend);
    }

    if (Math.abs(targetY - this.focusY) > DEADZONE_Y) {
      this.focusY = MathUtils.lerp(this.focusY, targetY - Math.sign(targetY - this.focusY) * DEADZONE_Y, blend);
    }

    let shakeX = 0;
    let shakeY = 0;

    if (now < this.shakeUntil) {
      shakeX = (Math.random() - 0.5) * 2 * this.shakeAmplitude;
      shakeY = (Math.random() - 0.5) * 2 * this.shakeAmplitude;
    } else {
      this.shakeAmplitude = 0;
    }

    this.apply(this.lookAhead, shakeX, shakeY);
  }

  private apply(sway: number, shakeX = 0, shakeY = 0): void {
    const camera = this.camera;
    const halfFov = MathUtils.degToRad(camera.fov / 2);
    const distanceForHeight = this.visibleHeight / 2 / Math.tan(halfFov);
    const distanceForWidth = MIN_VISIBLE_WIDTH / 2 / (Math.tan(halfFov) * camera.aspect);
    const distance = Math.max(distanceForHeight, distanceForWidth) * this.zoom;

    const halfHeight = Math.tan(halfFov) * distance;
    const halfWidth = halfHeight * camera.aspect;
    const x = clampToLevel(this.focusX, halfWidth, this.levelWidth);
    // O fundo da fase é o limite de baixo; para cima o céu é livre.
    const y = Math.max(this.focusY, halfHeight - LIFT * 0.35);

    this.focusX = x;
    camera.position.set(x - sway * 0.28 + shakeX, y + LIFT + shakeY, distance);
    camera.lookAt(x + shakeX * 0.5, y + 0.4, 0);
  }
}

function clampToLevel(value: number, halfView: number, levelSize: number): number {
  if (levelSize <= halfView * 2) {
    return levelSize / 2;
  }

  return MathUtils.clamp(value, halfView, levelSize - halfView);
}
