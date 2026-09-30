import type { BossDefinition, BossLook } from '../models/level.model';
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

export const BOSS_FRAME_WIDTH = 144;
export const BOSS_FRAME_HEIGHT = 120;

/** Quadros do chefão: parado, amassado no pouso, cansado e atingido. */
export const BOSS_FRAMES = { idle: 0, squash: 1, tired: 2, hurt: 3 } as const;

/** Linha do chão dentro do quadro: todo chefão pisa aqui, seja qual for o desenho. */
const GROUND = 114;

interface BodyPose {
  readonly isSquashed: boolean;
  /** Cor do corpo no quadro: mais clara quando o chefão acabou de levar um pisão. */
  readonly body: string;
}

/** Onde fica o rosto de cada desenho, para os olhos caírem sempre no lugar certo. */
interface Face {
  readonly centerX: number;
  readonly eyeY: number;
  readonly spacing: number;
  readonly eyeSize: number;
}

type BodyPainter = (context: CanvasRenderingContext2D, boss: BossDefinition, pose: BodyPose) => Face;

const PAINTERS: Readonly<Record<BossLook, BodyPainter>> = {
  slime: paintSlimeKing,
  cactus: paintCactusKing,
  ice: paintIceBlock,
  magma: paintMagmaRock,
  comet: paintCometKing,
};

/**
 * Os cinco chefões, cada um com o próprio desenho.
 *
 * Todos cabem na mesma caixa e pisam na mesma linha do quadro — a física do
 * motor é uma só —, mas o corpo, o acessório e o jeito de amassar no pouso são
 * de cada um. O rosto é compartilhado: olhos bravos, espiral quando cansa (a
 * deixa para o pisão) e "x" quando é atingido.
 */
export function paintBossStrip(boss: BossDefinition): HTMLCanvasElement {
  return paintStrip(BOSS_FRAME_WIDTH, BOSS_FRAME_HEIGHT, 4, (context, frame) => {
    const pose: BodyPose = {
      isSquashed: frame === BOSS_FRAMES.squash,
      body: frame === BOSS_FRAMES.hurt ? lighten(boss.color, 0.45) : boss.color,
    };
    const face = PAINTERS[boss.look](context, boss, pose);

    paintFace(context, frame, face);
  });
}

/* Rei Slime: a gelatina azul de coroa ------------------------------------------- */

function paintSlimeKing(context: CanvasRenderingContext2D, boss: BossDefinition, pose: BodyPose): Face {
  const top = pose.isSquashed ? 40 : 26;
  const bulge = pose.isSquashed ? 6 : 0;

  context.beginPath();
  context.moveTo(10 - bulge, GROUND);
  context.bezierCurveTo(4 - bulge, top, 140 + bulge, top, 134 + bulge, GROUND);
  context.closePath();
  fillAndOutline(context, pose.body, 4);
  shine(context, 44, top + 26, 16, 9);
  groundShadow(context, boss.color, 58);
  paintCrown(context, boss.accent, 72, top - 2);

  return { centerX: 72, eyeY: top + 44, spacing: 16, eyeSize: 10 };
}

/* Rei Cacto: alto, de braços erguidos e flor na cabeça ------------------------------- */

function paintCactusKing(context: CanvasRenderingContext2D, boss: BossDefinition, pose: BodyPose): Face {
  const top = pose.isSquashed ? 30 : 14;
  const width = pose.isSquashed ? 66 : 58;
  const left = 72 - width / 2;

  // Braços: o da esquerda mais alto, o da direita mais baixo — assimetria de cacto de verdade.
  roundedRect(context, 18, top + 26, 16, 38, 8);
  fillAndOutline(context, pose.body, 4);
  roundedRect(context, 18, top + 52, left - 14, 14, 7);
  fillAndOutline(context, pose.body, 4);
  roundedRect(context, 110, top + 40, 16, 34, 8);
  fillAndOutline(context, pose.body, 4);
  roundedRect(context, left + width - 4, top + 62, 126 - (left + width - 4), 14, 7);
  fillAndOutline(context, pose.body, 4);

  roundedRect(context, left, top, width, GROUND - top, 26);
  fillAndOutline(context, pose.body, 4);

  context.strokeStyle = darken(pose.body, 0.2);
  context.lineWidth = 3;
  context.beginPath();

  for (const offset of [-14, 14]) {
    context.moveTo(72 + offset, top + 16);
    context.lineTo(72 + offset, GROUND - 6);
  }

  context.stroke();

  // Espinhos claros: avisam que só vale pisar quando ele cansar.
  context.fillStyle = '#fff3d6';

  for (let row = 0; row < 4; row += 1) {
    for (const x of [left - 3, left + width - 1]) {
      context.beginPath();
      context.moveTo(x, top + 30 + row * 18);
      context.lineTo(x + (x < 72 ? -6 : 6), top + 34 + row * 18);
      context.lineTo(x, top + 38 + row * 18);
      context.fill();
    }
  }

  shine(context, left + 14, top + 22, 5, 12);
  groundShadow(context, boss.color, 36);

  // Flor no alto, no lugar da coroa.
  for (let petal = 0; petal < 6; petal += 1) {
    const angle = (petal / 6) * Math.PI * 2;
    circle(context, 72 + Math.cos(angle) * 9, top - 4 + Math.sin(angle) * 9, 7);
    fillAndOutline(context, boss.accent, 2.5);
  }

  circle(context, 72, top - 4, 6);
  fillAndOutline(context, '#ffe066', 2.5);

  return { centerX: 72, eyeY: top + 36, spacing: 12, eyeSize: 8 };
}

/* Gelatão: um bloco de gelo gigante, com geada e floco de neve -------------------------- */

function paintIceBlock(context: CanvasRenderingContext2D, boss: BossDefinition, pose: BodyPose): Face {
  const top = pose.isSquashed ? 44 : 28;
  const left = pose.isSquashed ? 20 : 26;
  const right = pose.isSquashed ? 124 : 118;

  roundedRect(context, left, top, right - left, GROUND - top, 18);
  fillAndOutline(context, pose.body, 4);

  // Faixas de brilho em diagonal: a transparência do gelo.
  context.save();
  roundedRect(context, left + 4, top + 4, right - left - 8, GROUND - top - 8, 14);
  context.clip();
  context.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(left + 8, top + 46);
  context.lineTo(left + 46, top + 8);
  context.moveTo(right - 30, GROUND - 6);
  context.lineTo(right + 6, GROUND - 42);
  context.stroke();
  context.restore();

  // Geada no topo, escorrendo em pontinhas.
  context.fillStyle = boss.accent;
  context.beginPath();
  context.moveTo(left + 10, top + 2);
  context.lineTo(right - 10, top + 2);

  for (let tip = 0; tip < 6; tip += 1) {
    const x = right - 14 - tip * ((right - left - 28) / 5);
    context.lineTo(x + 5, top + 8);
    context.lineTo(x, top + 16 + (tip % 2) * 6);
    context.lineTo(x - 5, top + 8);
  }

  context.closePath();
  context.fill();
  context.strokeStyle = OUTLINE;
  context.lineWidth = 2;
  context.stroke();

  groundShadow(context, boss.color, 52);
  paintSnowflake(context, 72, top - 10);

  return { centerX: 72, eyeY: top + 44, spacing: 17, eyeSize: 10 };
}

function paintSnowflake(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.lineCap = 'round';

  for (const [width, color] of [[8, OUTLINE], [4, '#ffffff']] as const) {
    context.strokeStyle = color;
    context.lineWidth = width;
    context.beginPath();

    for (let arm = 0; arm < 3; arm += 1) {
      const angle = (arm / 3) * Math.PI;
      context.moveTo(x - Math.cos(angle) * 13, y - Math.sin(angle) * 13);
      context.lineTo(x + Math.cos(angle) * 13, y + Math.sin(angle) * 13);
    }

    context.stroke();
  }
}

/* Magmão: rocha escura rachada de lava, com chamas no topo ------------------------------ */

function paintMagmaRock(context: CanvasRenderingContext2D, boss: BossDefinition, pose: BodyPose): Face {
  const top = pose.isSquashed ? 40 : 28;
  const spread = pose.isSquashed ? 6 : 0;
  const rock = pose.body === boss.color ? '#5b3b3f' : lighten('#5b3b3f', 0.35);

  paintFlames(context, boss, top);

  context.beginPath();
  context.moveTo(12 - spread, GROUND);
  context.lineTo(20 - spread, top + 40);
  context.lineTo(40, top + 12);
  context.lineTo(62, top + 2);
  context.lineTo(90, top + 4);
  context.lineTo(112, top + 16);
  context.lineTo(126 + spread, top + 44);
  context.lineTo(132 + spread, GROUND);
  context.closePath();
  fillAndOutline(context, rock, 4);

  // Rachaduras de lava: brilham na cor do chefão.
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (const [width, color] of [[7, darken(boss.color, 0.2)], [3.5, boss.accent]] as const) {
    context.strokeStyle = color;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(30, GROUND - 6);
    context.lineTo(38, top + 60);
    context.lineTo(30, top + 42);
    context.moveTo(112, GROUND - 4);
    context.lineTo(104, top + 58);
    context.lineTo(114, top + 40);
    context.moveTo(66, GROUND - 2);
    context.lineTo(72, top + 72);
    context.lineTo(80, GROUND - 2);
    context.stroke();
  }

  groundShadow(context, boss.color, 60);

  return { centerX: 72, eyeY: top + 40, spacing: 18, eyeSize: 10 };
}

function paintFlames(context: CanvasRenderingContext2D, boss: BossDefinition, top: number): void {
  for (const [x, height, width] of [[50, 30, 14], [72, 42, 18], [94, 30, 14]] as const) {
    context.beginPath();
    context.moveTo(x - width, top + 14);
    context.quadraticCurveTo(x - width, top - height * 0.4, x, top - height);
    context.quadraticCurveTo(x + width, top - height * 0.4, x + width, top + 14);
    context.closePath();
    fillAndOutline(context, boss.color, 3);
    context.fillStyle = boss.accent;
    ellipse(context, x, top + 2, width * 0.45, height * 0.4);
    context.fill();
  }
}

/* Cometa Rei: uma bola estrelada com cauda de brilhos -------------------------------------- */

function paintCometKing(context: CanvasRenderingContext2D, boss: BossDefinition, pose: BodyPose): Face {
  const radiusX = pose.isSquashed ? 50 : 42;
  const radiusY = pose.isSquashed ? 34 : 42;
  const centerX = 84;
  const centerY = GROUND - radiusY;

  // Cauda: três faixas afinando para trás, na cor de destaque.
  for (const [offset, length, thickness] of [[-18, 70, 12], [0, 80, 16], [18, 64, 11]] as const) {
    context.beginPath();
    context.moveTo(centerX - 20, centerY + offset - thickness);
    context.quadraticCurveTo(centerX - length * 0.6, centerY + offset - thickness * 0.6, centerX - length, centerY + offset);
    context.quadraticCurveTo(centerX - length * 0.6, centerY + offset + thickness * 0.6, centerX - 20, centerY + offset + thickness);
    context.closePath();
    fillAndOutline(context, boss.accent, 3);
  }

  context.fillStyle = '#ffffff';

  for (const [x, y, size] of [[14, centerY - 24, 5], [26, centerY + 22, 4], [6, centerY + 4, 3]] as const) {
    star(context, x, y, size, size * 0.45);
    context.fill();
  }

  ellipse(context, centerX, centerY, radiusX, radiusY);
  fillAndOutline(context, pose.body, 4);

  // Pintinhas de estrela no corpo.
  context.fillStyle = lighten(boss.color, 0.5);

  for (const [x, y] of [[centerX + 22, centerY + 18], [centerX - 24, centerY + 14], [centerX + 30, centerY - 12]] as const) {
    star(context, x, y, 5, 2.2);
    context.fill();
  }

  shine(context, centerX - 18, centerY - 20, 10, 6);
  groundShadow(context, boss.color, radiusX + 6, centerX);
  paintCrown(context, boss.accent, centerX, centerY - radiusY - 2);

  return { centerX, eyeY: centerY - 4, spacing: 15, eyeSize: 9 };
}

/* Partes compartilhadas ---------------------------------------------------------------- */

function groundShadow(context: CanvasRenderingContext2D, color: string, halfWidth: number, centerX = 72): void {
  context.fillStyle = darken(color, 0.18);
  ellipse(context, centerX, GROUND - 2, halfWidth, 5);
  context.fill();
}

function paintCrown(context: CanvasRenderingContext2D, color: string, centerX: number, baseY: number): void {
  context.beginPath();
  context.moveTo(centerX - 22, baseY + 14);
  context.lineTo(centerX - 26, baseY - 8);
  context.lineTo(centerX - 12, baseY + 2);
  context.lineTo(centerX, baseY - 14);
  context.lineTo(centerX + 12, baseY + 2);
  context.lineTo(centerX + 26, baseY - 8);
  context.lineTo(centerX + 22, baseY + 14);
  context.closePath();
  fillAndOutline(context, color, 3);

  context.fillStyle = '#ff5a8a';
  circle(context, centerX, baseY + 4, 4);
  context.fill();
  context.fillStyle = '#ffffff';
  star(context, centerX, baseY - 6, 3, 1.4);
  context.fill();
}

function paintFace(context: CanvasRenderingContext2D, frame: number, face: Face): void {
  const { centerX, eyeY, spacing, eyeSize } = face;
  const eyes = [centerX - spacing, centerX + spacing];

  context.strokeStyle = OUTLINE;
  context.lineWidth = 3.5;
  context.lineCap = 'round';

  if (frame === BOSS_FRAMES.tired) {
    // Olhos em espiral: é a deixa para o Pedro pular nele.
    for (const eyeX of eyes) {
      context.beginPath();

      for (let step = 0; step < 24; step += 1) {
        const angle = step * 0.55;
        const radius = 1 + step * (eyeSize / 24);
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
    context.arc(centerX, eyeY + eyeSize * 2.6, eyeSize * 0.7, Math.PI * 1.15, Math.PI * 1.85);
    context.stroke();
    return;
  }

  if (frame === BOSS_FRAMES.hurt) {
    for (const eyeX of eyes) {
      const size = eyeSize * 0.7;
      context.beginPath();
      context.moveTo(eyeX - size, eyeY - size * 0.7);
      context.lineTo(eyeX + size, eyeY + size * 0.7);
      context.moveTo(eyeX + size, eyeY - size * 0.7);
      context.lineTo(eyeX - size, eyeY + size * 0.7);
      context.stroke();
    }

    return;
  }

  for (const eyeX of eyes) {
    eye(context, eyeX, eyeY, eyeSize, 0);
  }

  // Sobrancelhas de bravo, mas de mentirinha.
  context.beginPath();
  context.moveTo(eyes[0] - eyeSize * 1.2, eyeY - eyeSize * 1.6);
  context.lineTo(eyes[0] + eyeSize * 0.8, eyeY - eyeSize);
  context.moveTo(eyes[1] + eyeSize * 1.2, eyeY - eyeSize * 1.6);
  context.lineTo(eyes[1] - eyeSize * 0.8, eyeY - eyeSize);
  context.stroke();

  context.beginPath();
  context.arc(centerX, eyeY + eyeSize * 1.8, eyeSize * 0.9, Math.PI * 0.15, Math.PI * 0.85);
  context.stroke();
}
