import type { BossDefinition, EnemyKind } from '../models/level.model';
import {
  circle,
  darken,
  ellipse,
  eye,
  fillAndOutline,
  lighten,
  OUTLINE,
  paintStrip,
  roundedRect,
  shine,
  star,
} from './canvas';

export const ENEMY_FRAME = 48;
export const ENEMY_FRAMES = 2;

export const BOSS_FRAME_WIDTH = 144;
export const BOSS_FRAME_HEIGHT = 120;

/** Quadros do chefão: parado, amassado no pouso, cansado e atingido. */
export const BOSS_FRAMES = { idle: 0, squash: 1, tired: 2, hurt: 3 } as const;

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

/* Chefão ------------------------------------------------------------------- */

export function paintBossStrip(boss: BossDefinition): HTMLCanvasElement {
  return paintStrip(BOSS_FRAME_WIDTH, BOSS_FRAME_HEIGHT, 4, (context, frame) => paintBoss(context, boss, frame));
}

function paintBoss(context: CanvasRenderingContext2D, boss: BossDefinition, frame: number): void {
  const isSquash = frame === BOSS_FRAMES.squash;
  const top = isSquash ? 40 : 26;
  const sideBulge = isSquash ? 6 : 0;
  const body = frame === BOSS_FRAMES.hurt ? lighten(boss.color, 0.45) : boss.color;

  context.beginPath();
  context.moveTo(10 - sideBulge, 114);
  context.bezierCurveTo(4 - sideBulge, top, 140 + sideBulge, top, 134 + sideBulge, 114);
  context.closePath();
  fillAndOutline(context, body, 4);
  shine(context, 44, top + 26, 16, 9);
  context.fillStyle = darken(boss.color, 0.18);
  ellipse(context, 72, 112, 58, 5);
  context.fill();

  paintCrown(context, boss.accent, top - 2);
  paintBossFace(context, frame, top);
}

function paintCrown(context: CanvasRenderingContext2D, color: string, baseY: number): void {
  context.beginPath();
  context.moveTo(50, baseY + 14);
  context.lineTo(46, baseY - 8);
  context.lineTo(60, baseY + 2);
  context.lineTo(72, baseY - 14);
  context.lineTo(84, baseY + 2);
  context.lineTo(98, baseY - 8);
  context.lineTo(94, baseY + 14);
  context.closePath();
  fillAndOutline(context, color, 3);

  context.fillStyle = '#ff5a8a';
  circle(context, 72, baseY + 4, 4);
  context.fill();
  context.fillStyle = '#ffffff';
  star(context, 72, baseY - 6, 3, 1.4);
  context.fill();
}

function paintBossFace(context: CanvasRenderingContext2D, frame: number, top: number): void {
  const eyeY = top + 44;

  context.strokeStyle = OUTLINE;
  context.lineWidth = 3.5;

  if (frame === BOSS_FRAMES.tired) {
    // Olhos em espiral: é a deixa para o Pedro pular nele.
    for (const eyeX of [56, 88]) {
      context.beginPath();

      for (let step = 0; step < 24; step += 1) {
        const angle = step * 0.55;
        const radius = 1 + step * 0.42;
        const x = eyeX + Math.cos(angle) * radius;
        const y = eyeY + Math.sin(angle) * radius;

        if (step === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      context.stroke();
    }

    context.beginPath();
    context.arc(72, eyeY + 26, 7, Math.PI * 1.15, Math.PI * 1.85);
    context.stroke();
    return;
  }

  if (frame === BOSS_FRAMES.hurt) {
    for (const eyeX of [56, 88]) {
      context.beginPath();
      context.moveTo(eyeX - 7, eyeY - 5);
      context.lineTo(eyeX + 7, eyeY + 5);
      context.moveTo(eyeX + 7, eyeY - 5);
      context.lineTo(eyeX - 7, eyeY + 5);
      context.stroke();
    }

    return;
  }

  eye(context, 56, eyeY, 10, 0);
  eye(context, 88, eyeY, 10, 0);

  // Sobrancelhas de bravo, mas de mentirinha.
  context.beginPath();
  context.moveTo(44, eyeY - 16);
  context.lineTo(64, eyeY - 10);
  context.moveTo(100, eyeY - 16);
  context.lineTo(80, eyeY - 10);
  context.stroke();

  context.beginPath();
  context.arc(72, eyeY + 18, 9, Math.PI * 0.15, Math.PI * 0.85);
  context.stroke();
}
