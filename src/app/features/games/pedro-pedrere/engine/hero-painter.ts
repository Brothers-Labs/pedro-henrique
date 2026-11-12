import { type HatId, type HeroLook, pantsHex, shirtHex } from '../config/hero-look.config';

export type HeroMotionKind = 'parado' | 'correndo' | 'no-ar';

/** Onde e como desenhar o Pedro; as medidas são em pixels da tela. */
export interface HeroPose {
  /** Centro dos pés, onde o corpo encosta no chão. */
  readonly centerX: number;
  readonly feetY: number;
  /** Pixels por bloco. */
  readonly scale: number;
  readonly facing: -1 | 1;
  readonly motion: HeroMotionKind;
  readonly timeSeconds: number;
  /** Menos de 1 quando o Pedro pisca depois de se machucar. */
  readonly opacity?: number;
}

export const INK = '#2a2350';
const SKIN = '#f2c39b';
const HAIR = '#5a3420';
const SHOES = '#3a2a24';
const OUTLINE = 0.045;
const STRIDE_SPEED = 14;

/**
 * Desenha o Pedro com a roupa escolhida, de lado e virado para onde anda.
 *
 * Tudo é medido em blocos dentro do desenho (o canvas é escalado antes), o
 * que deixa o mesmo boneco nítido na pré-visualização pequena da tela de
 * personagem e no jogo em tela cheia.
 */
export function paintHero(context: CanvasRenderingContext2D, look: HeroLook, pose: HeroPose): void {
  const stride = pose.motion === 'correndo' ? Math.sin(pose.timeSeconds * STRIDE_SPEED) : 0;
  const legSwing = pose.motion === 'no-ar' ? 0.5 : stride * 0.6;

  context.save();
  context.globalAlpha = pose.opacity ?? 1;
  context.translate(pose.centerX, pose.feetY);
  context.scale(pose.facing * pose.scale, pose.scale);
  context.lineWidth = OUTLINE;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.strokeStyle = INK;

  paintLeg(context, look, -0.09, legSwing);
  paintLeg(context, look, 0.09, -legSwing);
  paintArm(context, look, -legSwing, -0.2);
  paintBody(context, look);
  paintHead(context);
  paintHat(context, look.hat);
  paintArm(context, look, legSwing, 0.18);

  context.restore();
}

function paintLeg(context: CanvasRenderingContext2D, look: HeroLook, offsetX: number, swing: number): void {
  context.save();
  context.translate(offsetX, -0.34);
  context.rotate(swing);
  fillStroke(context, pantsHex(look.pants), () => roundedRect(context, -0.075, 0, 0.15, 0.3, 0.05));
  fillStroke(context, SHOES, () => roundedRect(context, -0.08, 0.26, 0.2, 0.09, 0.04));
  context.restore();
}

function paintArm(context: CanvasRenderingContext2D, look: HeroLook, swing: number, offsetX: number): void {
  context.save();
  context.translate(offsetX * 0.5, -0.62);
  context.rotate(swing * 0.8);
  fillStroke(context, shirtHex(look.shirt), () => roundedRect(context, -0.055, 0, 0.11, 0.26, 0.05));
  fillStroke(context, SKIN, () => circle(context, 0, 0.29, 0.06));
  context.restore();
}

function paintBody(context: CanvasRenderingContext2D, look: HeroLook): void {
  fillStroke(context, shirtHex(look.shirt), () => roundedRect(context, -0.22, -0.68, 0.44, 0.38, 0.1));
  fillStroke(context, pantsHex(look.pants), () => roundedRect(context, -0.22, -0.4, 0.44, 0.1, 0.03));
}

function paintHead(context: CanvasRenderingContext2D): void {
  fillStroke(context, SKIN, () => circle(context, 0, -0.88, 0.22));
  fillStroke(context, HAIR, () => {
    context.beginPath();
    context.arc(0, -0.9, 0.22, Math.PI * 1.02, Math.PI * 1.98);
    context.closePath();
  });

  context.fillStyle = INK;
  circle(context, 0.1, -0.88, 0.03);
  context.fill();

  context.beginPath();
  context.arc(0.08, -0.81, 0.07, Math.PI * 0.15, Math.PI * 0.7);
  context.stroke();
}

function paintHat(context: CanvasRenderingContext2D, hat: HatId): void {
  switch (hat) {
    case 'nenhum':
      return;
    case 'bone':
      fillStroke(context, '#e8433f', () => {
        context.beginPath();
        context.arc(0, -0.98, 0.21, Math.PI, 0);
        context.closePath();
      });
      fillStroke(context, '#e8433f', () => roundedRect(context, 0.05, -1.0, 0.3, 0.06, 0.03));
      return;
    case 'coroa':
      fillStroke(context, '#ffcf3f', () => {
        context.beginPath();
        context.moveTo(-0.18, -1.02);
        context.lineTo(-0.2, -1.26);
        context.lineTo(-0.1, -1.14);
        context.lineTo(0, -1.3);
        context.lineTo(0.1, -1.14);
        context.lineTo(0.2, -1.26);
        context.lineTo(0.18, -1.02);
        context.closePath();
      });
      return;
    case 'capacete':
      fillStroke(context, '#ffffff', () => {
        context.beginPath();
        context.arc(0, -0.94, 0.25, Math.PI, 0);
        context.closePath();
      });
      context.fillStyle = '#e8433f';
      context.fillRect(-0.04, -1.17, 0.08, 0.2);
      return;
    case 'cartola':
      fillStroke(context, '#2b2b38', () => roundedRect(context, -0.27, -1.06, 0.54, 0.07, 0.03));
      fillStroke(context, '#2b2b38', () => roundedRect(context, -0.17, -1.42, 0.34, 0.38, 0.03));
      context.fillStyle = '#e8433f';
      context.fillRect(-0.17, -1.13, 0.34, 0.06);
      return;
  }
}

function fillStroke(context: CanvasRenderingContext2D, color: string, tracePath: () => void): void {
  tracePath();
  context.fillStyle = color;
  context.fill();
  context.stroke();
}

export function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

export function circle(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
}
