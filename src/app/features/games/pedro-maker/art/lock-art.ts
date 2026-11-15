import { circle, fillAndOutline, roundedRect, shine } from './canvas';

/** Chave, corrente e alavanca ocupam o quadrado de um bloco: 48 por 48. */
export const LOCK_ART_SIZE = 48;
/** A porta com cadeado tem dois blocos de altura, como as outras portas. */
export const LOCKED_DOOR_WIDTH = 48;
export const LOCKED_DOOR_HEIGHT = 96;

const GOLD = '#ffc629';
const STEEL = '#8d96a8';
const DARK_STEEL = '#4a5163';

/** Chave dourada deitada: argola à esquerda, haste e dentes à direita. */
export function paintKey(context: CanvasRenderingContext2D): void {
  roundedRect(context, 18, 20, 26, 7, 2);
  fillAndOutline(context, GOLD, 2.5);
  roundedRect(context, 32, 26, 5, 8, 1);
  fillAndOutline(context, GOLD, 2);
  roundedRect(context, 39, 26, 5, 11, 1);
  fillAndOutline(context, GOLD, 2);

  circle(context, 13, 23, 10);
  fillAndOutline(context, GOLD, 3);
  circle(context, 13, 23, 4);
  context.fillStyle = '#ffffff';
  context.fill();
  context.lineWidth = 2;
  context.stroke();

  shine(context, 9, 18, 3, 2);
}

/** Porta de madeira com moldura de pedra, travessas de ferro e o cadeado dourado no meio. */
export function paintLockedDoor(context: CanvasRenderingContext2D): void {
  roundedRect(context, 3, 3, 42, 91, 5);
  fillAndOutline(context, '#6b6f80', 3);
  roundedRect(context, 9, 9, 30, 85, 3);
  fillAndOutline(context, '#7a4a2a', 2);

  context.fillStyle = '#8b5a33';

  for (const x of [16, 30]) {
    context.fillRect(x, 10, 3, 83);
  }

  context.fillStyle = DARK_STEEL;
  context.fillRect(9, 22, 30, 5);
  context.fillRect(9, 74, 30, 5);

  // Cadeado: o arco de aço e o corpo dourado com o buraco da chave.
  context.beginPath();
  context.arc(24, 44, 7, Math.PI, 0);
  context.strokeStyle = '#1a1a2e';
  context.lineWidth = 6;
  context.stroke();
  context.strokeStyle = STEEL;
  context.lineWidth = 3;
  context.stroke();

  roundedRect(context, 13, 44, 22, 18, 3);
  fillAndOutline(context, GOLD, 2.5);
  circle(context, 24, 51, 2.6);
  context.fillStyle = '#3a2a00';
  context.fill();
  context.fillRect(23, 52, 2, 6);
}

/** Bloco de corrente: barras de aço em cima e embaixo e três correntes de elos entre elas. */
export function paintChain(context: CanvasRenderingContext2D): void {
  for (const x of [11, 24, 37]) {
    for (let link = 0; link < 4; link += 1) {
      const y = 10 + link * 8;

      if (link % 2 === 0) {
        roundedRect(context, x - 4, y, 8, 11, 3.5);
        context.strokeStyle = '#1a1a2e';
        context.lineWidth = 4.5;
        context.stroke();
        context.strokeStyle = STEEL;
        context.lineWidth = 2.2;
        context.stroke();
      } else {
        roundedRect(context, x - 1.5, y, 3, 11, 1.5);
        fillAndOutline(context, '#a9b1c2', 1.5);
      }
    }
  }

  roundedRect(context, 2, 2, 44, 8, 2);
  fillAndOutline(context, DARK_STEEL, 2);
  roundedRect(context, 2, 38, 44, 8, 2);
  fillAndOutline(context, DARK_STEEL, 2);
}

/** Alavanca de cubos: base de pedra, bastão inclinado para a esquerda e a bola vermelha na ponta. */
export function paintLever(context: CanvasRenderingContext2D): void {
  context.save();
  context.translate(24, 38);
  context.rotate(-0.6);
  roundedRect(context, -2.5, -28, 5, 28, 2);
  fillAndOutline(context, '#c9a26b', 2);
  circle(context, 0, -29, 6.5);
  fillAndOutline(context, '#e5484d', 2.5);
  shine(context, -2, -31, 2, 1.5);
  context.restore();

  roundedRect(context, 8, 36, 32, 10, 3);
  fillAndOutline(context, '#6b6f80', 2.5);
  roundedRect(context, 16, 33, 16, 5, 2);
  fillAndOutline(context, DARK_STEEL, 2);
}
