import type { EnemyKind } from '../models/level.model';
import {
  circle,
  darken,
  ellipse,
  eye,
  fillAndOutline,
  lighten,
  OUTLINE,
  type Painter,
  type Point,
  roundedRect,
  shine,
} from './canvas';

const ENEMY_PAINTERS: Readonly<Record<EnemyKind, Painter>> = {
  slime: paintSlime,
  spiky: paintSpiky,
  bat: paintBat,
  robot: paintRobot,
  ghost: paintGhost,
  turtle: paintTurtle,
  piranha: paintPiranha,
  penguin: paintPenguin,
  'lava-bubble': paintLavaBubble,
  bee: paintBee,
  goomba: paintGoomba,
  bullet: paintBullet,
  thwomp: paintThwomp,
  'king-slime': paintKingSlime,
};

export function paintEnemyIcon(context: CanvasRenderingContext2D, kind: EnemyKind): void {
  ENEMY_PAINTERS[kind](context);
}

function paintSlime(context: CanvasRenderingContext2D): void {
  const color = '#6fd66a';

  context.beginPath();
  context.moveTo(5, 44);
  context.bezierCurveTo(4, 16, 44, 16, 43, 44);
  context.closePath();
  fillAndOutline(context, color);
  shine(context, 16, 26, 5, 3);
  context.fillStyle = darken(color, 0.15);
  ellipse(context, 24, 42, 14, 2.5);
  context.fill();

  eye(context, 19, 31, 4.5, 0);
  eye(context, 30, 31, 4.5, 0);
  smile(context, 24.5, 37, 3.5);
}

function paintSpiky(context: CanvasRenderingContext2D): void {
  const color = '#f28b3a';

  // Os espinhos claros no topo avisam, sem palavra nenhuma, que não se pisa.
  context.fillStyle = '#fff3d6';
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2.5;

  for (let spike = 0; spike < 5; spike += 1) {
    const angle = Math.PI * (1.1 + spike * 0.2);
    const baseX = 24 + Math.cos(angle) * 14;
    const baseY = 30 + Math.sin(angle) * 14;
    const tipX = 24 + Math.cos(angle) * 24;
    const tipY = 30 + Math.sin(angle) * 24;
    const side = 5;

    context.beginPath();
    context.moveTo(baseX - Math.sin(angle) * side, baseY + Math.cos(angle) * side);
    context.lineTo(tipX, tipY);
    context.lineTo(baseX + Math.sin(angle) * side, baseY - Math.cos(angle) * side);
    context.closePath();
    context.fill();
    context.stroke();
  }

  ellipse(context, 24, 32, 17, 14);
  fillAndOutline(context, color);
  shine(context, 17, 25, 4, 2.5);

  context.fillStyle = darken(color, 0.25);
  ellipse(context, 15, 45, 5, 3);
  context.fill();
  ellipse(context, 33, 45, 5, 3);
  context.fill();

  eye(context, 19, 31, 3.8, 0.1);
  eye(context, 29, 31, 3.8, 0.1);
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(20, 38);
  context.lineTo(28, 38);
  context.stroke();
}

function paintBat(context: CanvasRenderingContext2D): void {
  const color = '#8a63d9';
  const wingLift = -8;

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

function paintRobot(context: CanvasRenderingContext2D): void {
  const body = '#a9b4c8';

  context.strokeStyle = OUTLINE;
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(24, 12);
  context.lineTo(24, 5);
  context.stroke();
  circle(context, 24, 5, 3.5);
  fillAndOutline(context, '#ff5a5a', 2);

  roundedRect(context, 9, 12, 30, 27, 7);
  fillAndOutline(context, body);
  roundedRect(context, 13, 17, 22, 11, 5);
  fillAndOutline(context, '#2a2350', 2);
  context.fillStyle = '#5ff0ff';
  roundedRect(context, 16, 20, 7, 5, 2.5);
  context.fill();
  roundedRect(context, 25, 20, 7, 5, 2.5);
  context.fill();

  context.fillStyle = darken(body, 0.2);
  context.fillRect(15, 32, 18, 3);

  for (const wheelX of [15, 33]) {
    circle(context, wheelX, 42, 5.5);
    fillAndOutline(context, '#4b4470', 2.5);
    context.fillStyle = '#ffffff';
    circle(context, wheelX + 2.5, 42, 1.2);
    context.fill();
  }
}

function paintGhost(context: CanvasRenderingContext2D): void {
  context.beginPath();
  context.moveTo(8, 42);
  context.bezierCurveTo(4, 4, 44, 4, 40, 42);

  for (let bump = 0; bump < 4; bump += 1) {
    const x = 40 - bump * 8;
    context.quadraticCurveTo(x - 4, 46, x - 8, 42);
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

function paintTurtle(context: CanvasRenderingContext2D): void {
  const skin = '#f2c14e';
  const shell = '#3fae4d';

  for (const footX of [14, 30]) {
    roundedRect(context, footX - 5, 38, 10, 8, 3);
    fillAndOutline(context, skin, 2);
  }

  circle(context, 39, 24, 8);
  fillAndOutline(context, skin);
  eye(context, 41, 22, 3.4, 0.3);

  context.beginPath();
  context.moveTo(4, 40);
  context.bezierCurveTo(4, 12, 36, 12, 36, 40);
  context.closePath();
  fillAndOutline(context, shell);
  shine(context, 13, 24, 4, 2.5);

  context.strokeStyle = darken(shell, 0.3);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(20, 20);
  context.lineTo(20, 39);
  context.moveTo(8, 31);
  context.lineTo(33, 31);
  context.stroke();

  roundedRect(context, 2, 38, 36, 5, 2.5);
  fillAndOutline(context, '#fff3d6', 2);
}

function paintPiranha(context: CanvasRenderingContext2D): void {
  const leaf = '#45b95a';

  context.strokeStyle = '#2f8f47';
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(24, 48);
  context.lineTo(24, 26);
  context.stroke();

  for (const side of [-1, 1]) {
    ellipse(context, 24 + side * 9, 40, 8, 3.5);
    fillAndOutline(context, leaf, 2);
  }

  // Cabeça vermelha de boca aberta: as duas metades e os dentinhos brancos.
  context.beginPath();
  context.arc(24, 18, 15, Math.PI * 0.95, Math.PI * 2.05);
  context.closePath();
  fillAndOutline(context, '#e8343f');
  context.beginPath();
  context.arc(24, 22, 13, Math.PI * 0.05, Math.PI * 0.95);
  context.closePath();
  fillAndOutline(context, '#e8343f');

  context.fillStyle = '#ffffff';

  for (const [x, y, radius] of [[17, 10, 2.6], [29, 8, 2], [32, 15, 2.2], [20, 28, 2]] as const) {
    circle(context, x, y, radius);
    context.fill();
  }

  for (const toothX of [15, 21, 27, 33]) {
    context.beginPath();
    context.moveTo(toothX - 2.5, 19);
    context.lineTo(toothX, 22.5);
    context.lineTo(toothX + 2.5, 19);
    context.closePath();
    context.fill();
  }
}

function paintPenguin(context: CanvasRenderingContext2D): void {
  const orange = '#ff9f1a';

  for (const footX of [17, 31]) {
    ellipse(context, footX, 45, 6, 2.5);
    fillAndOutline(context, orange, 2);
  }

  context.beginPath();
  context.moveTo(24, 6);
  context.bezierCurveTo(42, 6, 42, 46, 24, 44);
  context.bezierCurveTo(6, 46, 6, 6, 24, 6);
  fillAndOutline(context, '#2a2f4a');

  ellipse(context, 24, 31, 10, 12);
  fillAndOutline(context, '#f7fbff', 2);

  eye(context, 19, 18, 3.6, 0);
  eye(context, 29, 18, 3.6, 0);

  context.beginPath();
  context.moveTo(20, 23);
  context.lineTo(28, 23);
  context.lineTo(24, 28);
  context.closePath();
  fillAndOutline(context, orange, 2);
}

function paintLavaBubble(context: CanvasRenderingContext2D): void {
  // Labaredas em cima, bola de brasa embaixo: é fogo e não se pisa.
  context.beginPath();
  context.moveTo(10, 28);
  context.quadraticCurveTo(12, 10, 18, 6);
  context.quadraticCurveTo(20, 14, 24, 4);
  context.quadraticCurveTo(28, 14, 31, 7);
  context.quadraticCurveTo(37, 12, 38, 28);
  context.closePath();
  fillAndOutline(context, '#ffd23f');

  circle(context, 24, 30, 15);
  fillAndOutline(context, '#ff6a00');
  context.fillStyle = '#ffb020';
  ellipse(context, 24, 34, 9, 7);
  context.fill();
  shine(context, 17, 23, 4, 2.5);

  eye(context, 19, 28, 3.6, 0);
  eye(context, 29, 28, 3.6, 0);
}

function paintBee(context: CanvasRenderingContext2D): void {
  context.save();
  context.globalAlpha = 0.85;

  for (const [x, y] of [[18, 14], [30, 12]] as const) {
    ellipse(context, x, y, 8, 6);
    fillAndOutline(context, '#e6f6ff', 2);
  }

  context.restore();

  ellipse(context, 24, 30, 16, 11);
  fillAndOutline(context, '#ffc629');
  context.fillStyle = OUTLINE;
  context.fillRect(18, 20, 4, 20);
  context.fillRect(26, 20, 4, 20);

  context.beginPath();
  context.moveTo(8, 30);
  context.lineTo(2, 30);
  context.lineTo(8, 27);
  context.closePath();
  context.fill();

  eye(context, 35, 27, 3.4, 0.3);
}

function paintGoomba(context: CanvasRenderingContext2D): void {
  const cap = '#9a5a2e';

  for (const footX of [15, 33]) {
    ellipse(context, footX, 44, 7, 3.5);
    fillAndOutline(context, '#2a1a10', 2);
  }

  roundedRect(context, 15, 28, 18, 14, 5);
  fillAndOutline(context, '#f2d3a0');

  // Cabeça de cogumelo larga, com as sobrancelhas bravas e os dentinhos.
  context.beginPath();
  context.moveTo(4, 32);
  context.bezierCurveTo(4, 6, 44, 6, 44, 32);
  context.closePath();
  fillAndOutline(context, cap);
  shine(context, 15, 15, 5, 3);

  eye(context, 19, 23, 4, 0);
  eye(context, 29, 23, 4, 0);
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(14, 15);
  context.lineTo(22, 18);
  context.moveTo(34, 15);
  context.lineTo(26, 18);
  context.stroke();

  context.fillStyle = '#ffffff';

  for (const toothX of [20, 28]) {
    context.beginPath();
    context.moveTo(toothX - 2, 30);
    context.lineTo(toothX, 34);
    context.lineTo(toothX + 2, 30);
    context.closePath();
    context.fill();
  }
}

function paintBullet(context: CanvasRenderingContext2D): void {
  const metal = '#2a2f3a';

  // Corpo de lado, nariz redondo para a esquerda e a base mais escura atrás.
  context.beginPath();
  context.moveTo(36, 12);
  context.lineTo(18, 12);
  context.arc(18, 25, 13, Math.PI * 1.5, Math.PI * 0.5, true);
  context.lineTo(36, 38);
  context.closePath();
  fillAndOutline(context, metal);
  shine(context, 16, 17, 6, 2.5);

  roundedRect(context, 35, 9, 8, 32, 2);
  fillAndOutline(context, darken(metal, 0.3));

  eye(context, 17, 22, 4, -0.3);
  context.strokeStyle = '#ffffff';
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(11, 16);
  context.lineTo(20, 18);
  context.stroke();

  ellipse(context, 27, 36, 4, 3);
  fillAndOutline(context, '#ffffff', 2);
}

function paintThwomp(context: CanvasRenderingContext2D): void {
  const stone = '#8f9bb0';

  // Pontas de pedra em volta: é para fugir, não para pisar.
  context.fillStyle = '#cfd6e3';
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2;

  const spikes: readonly (readonly Point[])[] = [
    ...[14, 24, 34].map((x): readonly Point[] => [[x - 4, 7], [x, 1], [x + 4, 7]]),
    ...[18, 32].flatMap((y): (readonly Point[])[] => [
      [[6, y - 4], [1, y], [6, y + 4]],
      [[42, y - 4], [47, y], [42, y + 4]],
    ]),
  ];

  for (const [first, ...rest] of spikes) {
    context.beginPath();
    context.moveTo(first[0], first[1]);

    for (const [x, y] of rest) {
      context.lineTo(x, y);
    }

    context.closePath();
    context.fill();
    context.stroke();
  }

  roundedRect(context, 5, 6, 38, 40, 4);
  fillAndOutline(context, stone);
  roundedRect(context, 10, 11, 28, 30, 3);
  fillAndOutline(context, lighten(stone, 0.15), 1.5);

  eye(context, 18, 21, 4.2, 0);
  eye(context, 30, 21, 4.2, 0);
  context.strokeStyle = OUTLINE;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(12, 13);
  context.lineTo(22, 16);
  context.moveTo(36, 13);
  context.lineTo(26, 16);
  context.stroke();

  roundedRect(context, 14, 31, 20, 7, 2);
  fillAndOutline(context, OUTLINE, 1.5);
  context.fillStyle = '#ffffff';

  for (const toothX of [17, 22, 27, 32]) {
    context.fillRect(toothX - 1.5, 32, 3, 3);
  }
}

function paintKingSlime(context: CanvasRenderingContext2D): void {
  const color = '#4f9be8';

  context.beginPath();
  context.moveTo(2, 46);
  context.bezierCurveTo(1, 12, 47, 12, 46, 46);
  context.closePath();
  fillAndOutline(context, color);
  shine(context, 14, 26, 6, 3.5);

  eye(context, 18, 32, 4.5, 0);
  eye(context, 30, 32, 4.5, 0);
  smile(context, 24.5, 39, 4);

  // Coroa dourada com três pontas e a pedra vermelha.
  context.beginPath();
  context.moveTo(14, 18);
  context.lineTo(14, 6);
  context.lineTo(19, 11);
  context.lineTo(24, 3);
  context.lineTo(29, 11);
  context.lineTo(34, 6);
  context.lineTo(34, 18);
  context.closePath();
  fillAndOutline(context, '#ffc629', 2.5);
  circle(context, 24, 14, 2.5);
  fillAndOutline(context, '#e8343f', 1.5);
}

function smile(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y - radius / 2, radius, Math.PI * 0.2, Math.PI * 0.8);
  context.stroke();
}
