/**
 * Utilitários de desenho em Canvas 2D.
 *
 * Toda a arte do Pedro Maker é desenhada em código: não existe arquivo de
 * imagem para baixar, falhar ou pesar no carregamento — e nenhum traço vem de
 * outro jogo. Estes pintores não conhecem o Phaser; o editor usa os mesmos
 * desenhos para mostrar as peças.
 */

/** Contorno padrão, o mesmo azul-escuro das bordas "de gibi" do site. */
export const OUTLINE = '#2a2350';

export type Painter = (context: CanvasRenderingContext2D) => void;

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');

  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  return canvas;
}

export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas 2D indisponível neste navegador.');
  }

  return context;
}

export function paint(width: number, height: number, painter: Painter): HTMLCanvasElement {
  const canvas = createCanvas(width, height);

  painter(context2d(canvas));

  return canvas;
}

/** Tira horizontal de quadros de animação, cada um pintado pela mesma função. */
export function paintStrip(
  frameWidth: number,
  frameHeight: number,
  frames: number,
  painter: (context: CanvasRenderingContext2D, frame: number) => void,
): HTMLCanvasElement {
  return paint(frameWidth * frames, frameHeight, (context) => {
    for (let frame = 0; frame < frames; frame += 1) {
      context.save();
      context.translate(frame * frameWidth, 0);
      context.beginPath();
      context.rect(0, 0, frameWidth, frameHeight);
      context.clip();
      painter(context, frame);
      context.restore();
    }
  });
}

export function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safe = Math.max(0, Math.min(radius, width / 2, height / 2));

  context.beginPath();
  context.moveTo(x + safe, y);
  context.arcTo(x + width, y, x + width, y + height, safe);
  context.arcTo(x + width, y + height, x, y + height, safe);
  context.arcTo(x, y + height, x, y, safe);
  context.arcTo(x, y, x + width, y, safe);
  context.closePath();
}

/** Preenche o caminho atual e contorna com o traço grosso padrão. */
export function fillAndOutline(context: CanvasRenderingContext2D, fill: string | CanvasGradient, lineWidth = 3): void {
  context.fillStyle = fill;
  context.fill();
  context.lineWidth = lineWidth;
  context.lineJoin = 'round';
  context.strokeStyle = OUTLINE;
  context.stroke();
}

export function circle(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
}

export function ellipse(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
): void {
  context.beginPath();
  context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
}

/** Estrela de cinco pontas centrada em (x, y). */
export function star(context: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number): void {
  context.beginPath();

  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;

    if (point === 0) {
      context.moveTo(px, py);
    } else {
      context.lineTo(px, py);
    }
  }

  context.closePath();
}

/** Brilho branco translúcido, o toque que dá volume aos objetos. */
export function shine(context: CanvasRenderingContext2D, x: number, y: number, radiusX: number, radiusY: number): void {
  context.save();
  context.globalAlpha = 0.55;
  context.fillStyle = '#ffffff';
  ellipse(context, x, y, radiusX, radiusY);
  context.fill();
  context.restore();
}

/** Olho redondo com pupila e brilho, olhando levemente para a direita. */
export function eye(context: CanvasRenderingContext2D, x: number, y: number, size: number, lookX = 0.25): void {
  context.fillStyle = '#ffffff';
  ellipse(context, x, y, size * 0.72, size);
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = OUTLINE;
  context.stroke();

  context.fillStyle = OUTLINE;
  ellipse(context, x + size * lookX, y + size * 0.12, size * 0.42, size * 0.58);
  context.fill();

  context.fillStyle = '#ffffff';
  circle(context, x + size * lookX + size * 0.12, y - size * 0.15, size * 0.18);
  context.fill();
}

/** Mistura duas cores hexadecimais; `amount` 0 devolve a primeira. */
export function mix(first: string, second: string, amount: number): string {
  const a = parseHex(first);
  const b = parseHex(second);
  const channel = (index: number): string =>
    Math.round(a[index] + (b[index] - a[index]) * amount)
      .toString(16)
      .padStart(2, '0');

  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

export function darken(color: string, amount: number): string {
  return mix(color, '#000000', amount);
}

export function lighten(color: string, amount: number): string {
  return mix(color, '#ffffff', amount);
}

function parseHex(color: string): readonly [number, number, number] {
  const value = color.replace('#', '');
  const full = value.length === 3 ? value.split('').map((digit) => digit + digit).join('') : value;
  const number = Number.parseInt(full, 16);

  if (Number.isNaN(number) || full.length !== 6) {
    return [0, 0, 0];
  }

  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

/**
 * Pseudoaleatório determinístico para texturas.
 *
 * As manchas da terra e as estrelas do céu precisam sair iguais a cada
 * carregamento, senão o cenário "tremeria" entre uma partida e outra.
 */
export function textureNoise(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

    return state / 4294967296;
  };
}
