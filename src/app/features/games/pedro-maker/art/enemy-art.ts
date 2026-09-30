import type { EnemyKind } from '../models/level.model';
import {
  circle,
  darken,
  ellipse,
  eye,
  fillAndOutline,
  OUTLINE,
  paintStrip,
  roundedRect,
  shine,
} from './canvas';

export const ENEMY_FRAME = 48;
export const ENEMY_FRAMES = 2;

const ENEMY_PAINTERS: Readonly<Record<EnemyKind, (context: CanvasRenderingContext2D, frame: number) => void>> = {
  slime: paintSlime,
  spiky: paintSpiky,
  bat: paintBat,
  robot: paintRobot,
  ghost: paintGhost,
};

/** Dois quadros de animação de um inimigo, lado a lado. */
export function paintEnemyStrip(kind: EnemyKind): HTMLCanvasElement {
  return paintStrip(ENEMY_FRAME, ENEMY_FRAME, ENEMY_FRAMES, ENEMY_PAINTERS[kind]);
}

export function paintEnemyIcon(context: CanvasRenderingContext2D, kind: EnemyKind): void {
  ENEMY_PAINTERS[kind](context, 0);
}

function paintSlime(context: CanvasRenderingContext2D, frame: number): void {
  const squash = frame === 1 ? 3 : 0;
  const color = '#6fd66a';

  context.beginPath();
  context.moveTo(5, 44);
  context.bezierCurveTo(4, 16 + squash, 44, 16 + squash, 43, 44);
  context.closePath();
  fillAndOutline(context, color);
  shine(context, 16, 26 + squash, 5, 3);
  context.fillStyle = darken(color, 0.15);
  ellipse(context, 24, 42, 14, 2.5);
  context.fill();

  eye(context, 19, 31 + squash, 4.5, 0);
  eye(context, 30, 31 + squash, 4.5, 0);
  smile(context, 24.5, 37 + squash, 3.5);
}

function paintSpiky(context: CanvasRenderingContext2D, frame: number): void {
  const color = '#f28b3a';
  const bounce = frame === 1 ? 1.5 : 0;

  // Os espinhos claros no topo avisam, sem palavra nenhuma, que não se pisa.
  context.fillStyle = '#fff3d6';
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2.5;

  for (let spike = 0; spike < 5; spike += 1) {
    const angle = Math.PI * (1.1 + spike * 0.2);
    const baseX = 24 + Math.cos(angle) * 14;
    const baseY = 30 + bounce + Math.sin(angle) * 14;
    const tipX = 24 + Math.cos(angle) * 24;
    const tipY = 30 + bounce + Math.sin(angle) * 24;
    const side = 5;

    context.beginPath();
    context.moveTo(baseX - Math.sin(angle) * side, baseY + Math.cos(angle) * side);
    context.lineTo(tipX, tipY);
    context.lineTo(baseX + Math.sin(angle) * side, baseY - Math.cos(angle) * side);
    context.closePath();
    context.fill();
    context.stroke();
  }

  ellipse(context, 24, 32 + bounce, 17, 14);
  fillAndOutline(context, color);
  shine(context, 17, 25 + bounce, 4, 2.5);

  // Patinhas que alternam, dando a ideia de andar.
  context.fillStyle = darken(color, 0.25);
  ellipse(context, frame === 0 ? 15 : 17, 45, 5, 3);
  context.fill();
  ellipse(context, frame === 0 ? 33 : 31, 45, 5, 3);
  context.fill();

  eye(context, 19, 31 + bounce, 3.8, 0.1);
  eye(context, 29, 31 + bounce, 3.8, 0.1);
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(20, 38 + bounce);
  context.lineTo(28, 38 + bounce);
  context.stroke();
}

function paintBat(context: CanvasRenderingContext2D, frame: number): void {
  const color = '#8a63d9';
  const wingLift = frame === 0 ? -8 : 6;

  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(24 + side * 8, 24);
    context.quadraticCurveTo(24 + side * 20, 16 + wingLift, 24 + side * 23, 26 + wingLift);
    context.quadraticCurveTo(24 + side * 17, 26 + wingLift / 2, 24 + side * 15, 32);
    context.quadraticCurveTo(24 + side * 12, 28, 24 + side * 8, 30);
    context.closePath();
    fillAndOutline(context, darken(color, 0.15), 2.5);
  }

  circle(context, 24, 27, 11);
  fillAndOutline(context, color);

  context.beginPath();
  context.moveTo(17, 19);
  context.lineTo(18, 11);
  context.lineTo(22, 17);
  context.closePath();
  context.moveTo(31, 19);
  context.lineTo(30, 11);
  context.lineTo(26, 17);
  context.closePath();
  fillAndOutline(context, color, 2);

  eye(context, 20.5, 26, 3.4, 0);
  eye(context, 27.5, 26, 3.4, 0);
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.moveTo(22, 32);
  context.lineTo(23, 35);
  context.lineTo(24, 32);
  context.fill();
}

function paintRobot(context: CanvasRenderingContext2D, frame: number): void {
  const body = '#a9b4c8';

  context.strokeStyle = OUTLINE;
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(24, 12);
  context.lineTo(24, 5);
  context.stroke();
  circle(context, 24, 5, 3.5);
  fillAndOutline(context, frame === 0 ? '#ff5a5a' : '#ffd23f', 2);

  roundedRect(context, 9, 12, 30, 27, 7);
  fillAndOutline(context, body);
  roundedRect(context, 13, 17, 22, 11, 5);
  fillAndOutline(context, '#2a2350', 2);
  context.fillStyle = '#5ff0ff';
  roundedRect(context, 16 + (frame === 0 ? 0 : 3), 20, 7, 5, 2.5);
  context.fill();
  roundedRect(context, 25 + (frame === 0 ? 0 : 3), 20, 7, 5, 2.5);
  context.fill();

  context.fillStyle = darken(body, 0.2);
  context.fillRect(15, 32, 18, 3);

  for (const wheelX of [15, 33]) {
    circle(context, wheelX, 42, 5.5);
    fillAndOutline(context, '#4b4470', 2.5);
    context.fillStyle = '#ffffff';
    const angle = frame === 0 ? 0 : Math.PI / 4;
    circle(context, wheelX + Math.cos(angle) * 2.5, 42 + Math.sin(angle) * 2.5, 1.2);
    context.fill();
  }
}

function paintGhost(context: CanvasRenderingContext2D, frame: number): void {
  const wave = frame === 0 ? 0 : 3;

  context.beginPath();
  context.moveTo(8, 42);
  context.bezierCurveTo(4, 4, 44, 4, 40, 42);

  for (let bump = 0; bump < 4; bump += 1) {
    const x = 40 - bump * 8;
    context.quadraticCurveTo(x - 4, 46 + (bump % 2 === 0 ? wave : -wave), x - 8, 42);
  }

  context.closePath();
  fillAndOutline(context, '#f4f1ff');
  shine(context, 17, 17, 5, 3);

  context.fillStyle = OUTLINE;
  ellipse(context, 19, 24, 3, 4.5);
  context.fill();
  ellipse(context, 29, 24, 3, 4.5);
  context.fill();
  context.fillStyle = '#ffb3cf';
  ellipse(context, 15, 31, 3, 2);
  context.fill();
  ellipse(context, 33, 31, 3, 2);
  context.fill();
  context.fillStyle = OUTLINE;
  ellipse(context, 24, 33, 2.5, 3);
  context.fill();
}

function smile(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y - radius / 2, radius, Math.PI * 0.2, Math.PI * 0.8);
  context.stroke();
}
