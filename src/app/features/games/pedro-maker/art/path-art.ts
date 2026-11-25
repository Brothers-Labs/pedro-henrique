import { circle, eye, fillAndOutline, roundedRect, shine, smile } from './canvas';

/** Os desenhos ocupam o quadrado de um bloco, como o canhão: 48 por 48. */
export const PATH_ART_SIZE = 48;

/** Cano mágico: tubo verde com a boca larga em cima e a entrada escura. */
export function paintWarpPipe(context: CanvasRenderingContext2D): void {
  roundedRect(context, 9, 16, 30, 30, 3);
  fillAndOutline(context, '#2fae4e', 3);
  context.fillStyle = '#7ee08f';
  context.fillRect(13, 18, 4, 26);

  roundedRect(context, 4, 4, 40, 14, 3);
  fillAndOutline(context, '#2fae4e', 3);
  context.fillStyle = '#7ee08f';
  context.fillRect(8, 7, 5, 8);

  context.fillStyle = '#123d1c';
  context.fillRect(17, 24, 14, 20);
}

/** Flor Falante: pétalas rosa em volta de uma carinha sorridente, com o balãozinho de fala. */
export function paintTalkingFlower(context: CanvasRenderingContext2D): void {
  context.fillStyle = '#3b9c3b';
  context.fillRect(22, 26, 4, 20);
  roundedRect(context, 26, 34, 10, 5, 2);
  fillAndOutline(context, '#4fbf4a', 2);

  for (const [x, y] of [[24, 9], [24, 31], [13, 20], [35, 20]] as const) {
    circle(context, x, y, 7);
    fillAndOutline(context, '#ff6fae', 2);
  }

  circle(context, 24, 20, 9);
  fillAndOutline(context, '#fff4c2', 2);
  eye(context, 21, 18, 3);
  eye(context, 27, 18, 3);
  smile(context, 24, 22);

  // O balão diz "esta flor fala".
  roundedRect(context, 32, 1, 15, 10, 4);
  fillAndOutline(context, '#ffffff', 2);
  context.fillStyle = '#2a2350';

  for (const x of [36, 39.5, 43]) {
    circle(context, x, 6, 1.2);
    context.fill();
  }
}

/** Bastão de fogo: o bloco queimado com o parafuso e a fila de bolas de fogo saindo dele na diagonal. */
export function paintFireBar(context: CanvasRenderingContext2D): void {
  roundedRect(context, 4, 24, 20, 20, 3);
  fillAndOutline(context, '#7a4a2a', 3);
  circle(context, 14, 34, 3);
  fillAndOutline(context, '#3a2416', 1.5);

  for (const step of [1, 2, 3]) {
    const x = 14 + step * 9;
    const y = 34 - step * 9;

    circle(context, x, y, 5);
    fillAndOutline(context, '#ff6a1f', 2);
    circle(context, x, y, 2.4);
    context.fillStyle = '#ffd23f';
    context.fill();
  }

  shine(context, 10, 29, 3, 2);
}

/** Armadilha de Fogo: bloco de pedra escura com a grade de ferro em cima e a labareda subindo dela. */
export function paintFireTrap(context: CanvasRenderingContext2D): void {
  context.beginPath();
  context.moveTo(14, 26);
  context.quadraticCurveTo(10, 12, 20, 2);
  context.quadraticCurveTo(22, 12, 26, 8);
  context.quadraticCurveTo(30, 4, 30, 0);
  context.quadraticCurveTo(40, 12, 34, 26);
  context.closePath();
  fillAndOutline(context, '#ff6a1f', 2);
  context.beginPath();
  context.moveTo(19, 26);
  context.quadraticCurveTo(17, 18, 23, 12);
  context.quadraticCurveTo(26, 18, 29, 15);
  context.quadraticCurveTo(32, 20, 29, 26);
  context.closePath();
  context.fillStyle = '#ffd23f';
  context.fill();

  roundedRect(context, 4, 26, 40, 20, 3);
  fillAndOutline(context, '#4a3a36', 3);
  roundedRect(context, 10, 23, 28, 6, 2);
  fillAndOutline(context, '#2b2d42', 2);
  context.fillStyle = '#8d96a8';

  for (const x of [16, 23, 30]) {
    context.fillRect(x, 23.5, 2.5, 5);
  }

  shine(context, 10, 33, 3, 2);
}

/** Botão P: corpo azul com tampa clara, a letra P branca no meio e a base escura no chão. */
export function paintPSwitch(context: CanvasRenderingContext2D): void {
  roundedRect(context, 3, 40, 42, 7, 2);
  fillAndOutline(context, '#1d3f73', 2);

  roundedRect(context, 7, 12, 34, 30, 4);
  fillAndOutline(context, '#2f7de1', 3);
  roundedRect(context, 9, 8, 30, 7, 3);
  fillAndOutline(context, '#79b8ff', 2);

  context.fillStyle = '#ffffff';
  context.font = 'bold 22px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('P', 24, 28);

  shine(context, 13, 19, 2, 4);
}
