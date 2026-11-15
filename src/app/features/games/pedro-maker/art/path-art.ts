import { circle, eye, fillAndOutline, roundedRect, shine, smile } from './canvas';

/** Os três desenhos ocupam o quadrado de um bloco, como o canhão: 48 por 48. */
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
