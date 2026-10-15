import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

type Painter = (context: CanvasRenderingContext2D, width: number, height: number) => void;

function paint(width: number, height: number, painter: Painter): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas 2D indisponível para desenhar as texturas.');
  }

  painter(context, width, height);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;

  return texture;
}

/** Céu em degradê vertical. */
export function skyTexture(top: string, bottom: string): CanvasTexture {
  return paint(4, 256, (context, width, height) => {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  });
}

/** Asfalto com as linhas das três faixas; repete ao longo da pista. */
export function roadTexture(road: string, line: string): CanvasTexture {
  const texture = paint(256, 256, (context, width, height) => {
    context.fillStyle = road;
    context.fillRect(0, 0, width, height);
    context.fillStyle = line;

    // Bordas contínuas e duas linhas tracejadas entre as faixas.
    context.fillRect(4, 0, 8, height);
    context.fillRect(width - 12, 0, 8, height);

    for (const x of [width / 3, (width * 2) / 3]) {
      context.fillRect(x - 3, 0, 6, height / 2);
    }
  });

  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;

  return texture;
}

/** A coroa do Pedro, estampada no moletom, nas caixas e nas bandeiras. */
export function crownTexture(color: string, background = 'transparent'): CanvasTexture {
  return paint(128, 128, (context, width, height) => {
    if (background !== 'transparent') {
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
    }

    context.fillStyle = color;
    context.beginPath();
    context.moveTo(width * 0.15, height * 0.75);
    context.lineTo(width * 0.15, height * 0.32);
    context.lineTo(width * 0.35, height * 0.52);
    context.lineTo(width * 0.5, height * 0.22);
    context.lineTo(width * 0.65, height * 0.52);
    context.lineTo(width * 0.85, height * 0.32);
    context.lineTo(width * 0.85, height * 0.75);
    context.closePath();
    context.fill();
    context.fillRect(width * 0.15, height * 0.78, width * 0.7, height * 0.08);
  });
}

/** Madeira das caixas, com a coroa no meio. */
export function crateTexture(): CanvasTexture {
  return paint(128, 128, (context, width, height) => {
    context.fillStyle = '#a0662f';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = '#6b3f17';
    context.lineWidth = 10;
    context.strokeRect(5, 5, width - 10, height - 10);
    context.beginPath();
    context.moveTo(8, 8);
    context.lineTo(width - 8, height - 8);
    context.stroke();
    context.fillStyle = '#f5c542';
    context.font = 'bold 44px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('♛', width / 2, height / 2);
  });
}

/** Listras vermelhas e brancas das barreiras. */
export function stripeTexture(first: string, second: string): CanvasTexture {
  const texture = paint(128, 32, (context, width, height) => {
    context.fillStyle = first;
    context.fillRect(0, 0, width, height);
    context.fillStyle = second;

    for (let x = -height; x < width; x += 32) {
      context.beginPath();
      context.moveTo(x, height);
      context.lineTo(x + 16, height);
      context.lineTo(x + 16 + height, 0);
      context.lineTo(x + height, 0);
      context.closePath();
      context.fill();
    }
  });

  texture.wrapS = RepeatWrapping;

  return texture;
}

/** Setas da rampa, apontando para a frente. */
export function chevronTexture(): CanvasTexture {
  return paint(64, 128, (context, width, height) => {
    context.fillStyle = '#2b2b33';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#f5c542';

    for (const y of [height * 0.15, height * 0.5]) {
      context.beginPath();
      context.moveTo(width * 0.1, y + height * 0.3);
      context.lineTo(width * 0.5, y);
      context.lineTo(width * 0.9, y + height * 0.3);
      context.lineTo(width * 0.9, y + height * 0.42);
      context.lineTo(width * 0.5, y + height * 0.12);
      context.lineTo(width * 0.1, y + height * 0.42);
      context.closePath();
      context.fill();
    }
  });
}

/** Xadrez da linha de chegada. */
export function checkerTexture(): CanvasTexture {
  const texture = paint(64, 64, (context, width) => {
    const cell = width / 8;

    for (let row = 0; row < 8; row += 1) {
      for (let column = 0; column < 8; column += 1) {
        context.fillStyle = (row + column) % 2 === 0 ? '#ffffff' : '#111111';
        context.fillRect(column * cell, row * cell, cell, cell);
      }
    }
  });

  texture.wrapS = RepeatWrapping;

  return texture;
}

/** Janelas acesas dos prédios à noite. */
export function windowsTexture(lit: string, wall: string): CanvasTexture {
  const texture = paint(64, 128, (context, width, height) => {
    context.fillStyle = wall;
    context.fillRect(0, 0, width, height);

    for (let y = 6; y < height; y += 14) {
      for (let x = 6; x < width; x += 14) {
        context.fillStyle = (x * 7 + y * 3) % 5 === 0 ? wall : lit;
        context.fillRect(x, y, 8, 8);
      }
    }
  });

  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;

  return texture;
}
