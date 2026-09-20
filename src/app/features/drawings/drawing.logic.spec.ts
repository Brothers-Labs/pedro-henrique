import { DRAWING_HEIGHT, DRAWING_WIDTH, PAPER_COLOR } from '../../core/data/drawing.data';
import type { DrawingMark } from '../../core/models/drawing.model';
import { clearPaper, isFarEnough, paintMarks, toPaperPoint } from './drawing.logic';

function createContext(width = 200, height = 300): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas 2D indisponível neste navegador de teste.');
  }

  return context;
}

/** Cor do pixel no formato `r,g,b,a`, para comparar sem depender de string. */
function pixelAt(context: CanvasRenderingContext2D, x: number, y: number): string {
  return [...context.getImageData(x, y, 1, 1).data].join(',');
}

const WHITE = '255,255,255,255';

describe('toPaperPoint', () => {
  const bounds = { left: 0, top: 0, width: 300, height: 400 };

  it('converte a posição da tela para a coordenada da folha', () => {
    const point = toPaperPoint(150, 200, bounds, DRAWING_WIDTH, DRAWING_HEIGHT);

    expect(point.x).toBeCloseTo(DRAWING_WIDTH / 2, 5);
    expect(point.y).toBeCloseTo(DRAWING_HEIGHT / 2, 5);
  });

  it('desconta o deslocamento do elemento na página', () => {
    const shifted = { left: 100, top: 50, width: 300, height: 400 };
    const point = toPaperPoint(100, 50, shifted, DRAWING_WIDTH, DRAWING_HEIGHT);

    expect(point.x).toBe(0);
    expect(point.y).toBe(0);
  });

  it('não quebra quando o elemento ainda não tem tamanho', () => {
    const point = toPaperPoint(10, 10, { left: 0, top: 0, width: 0, height: 0 }, 100, 100);

    expect(point).toEqual({ x: 0, y: 0 });
  });
});

describe('isFarEnough', () => {
  it('recusa pontos grudados, para o traço não guardar centenas deles', () => {
    expect(isFarEnough({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeFalse();
  });

  it('aceita o ponto assim que ele se afasta o bastante', () => {
    expect(isFarEnough({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeTrue();
  });
});

describe('clearPaper', () => {
  it('deixa a folha branca', () => {
    const context = createContext();

    clearPaper(context, 200, 300);

    expect(pixelAt(context, 100, 150)).toBe(WHITE);
  });
});

describe('paintMarks', () => {
  it('desenha o traço sobre o papel branco', () => {
    const context = createContext();
    const marks: readonly DrawingMark[] = [
      {
        kind: 'traco',
        color: '#ff0000',
        size: 20,
        points: [
          { x: 20, y: 150 },
          { x: 180, y: 150 },
        ],
      },
    ];

    paintMarks(context, marks, 200, 300);

    expect(pixelAt(context, 100, 150)).toBe('255,0,0,255');
    expect(pixelAt(context, 100, 20)).toBe(WHITE);
  });

  it('apaga o que não está mais na lista, que é o desfazer da tela', () => {
    const context = createContext();
    const stroke: DrawingMark = {
      kind: 'traco',
      color: '#ff0000',
      size: 20,
      points: [
        { x: 20, y: 150 },
        { x: 180, y: 150 },
      ],
    };

    paintMarks(context, [stroke], 200, 300);
    expect(pixelAt(context, 100, 150)).toBe('255,0,0,255');

    paintMarks(context, [], 200, 300);
    expect(pixelAt(context, 100, 150)).toBe(WHITE);
  });

  it('a borracha pinta com a cor do papel', () => {
    const context = createContext();
    const marks: readonly DrawingMark[] = [
      {
        kind: 'traco',
        color: '#ff0000',
        size: 30,
        points: [
          { x: 20, y: 150 },
          { x: 180, y: 150 },
        ],
      },
      {
        kind: 'traco',
        color: PAPER_COLOR,
        size: 40,
        points: [
          { x: 80, y: 150 },
          { x: 120, y: 150 },
        ],
      },
    ];

    paintMarks(context, marks, 200, 300);

    expect(pixelAt(context, 100, 150)).toBe(WHITE);
    expect(pixelAt(context, 30, 150)).toBe('255,0,0,255');
  });

  it('um toque sem arrasto vira um pontinho', () => {
    const context = createContext();

    paintMarks(
      context,
      [{ kind: 'traco', color: '#0000ff', size: 40, points: [{ x: 100, y: 150 }] }],
      200,
      300,
    );

    expect(pixelAt(context, 100, 150)).toBe('0,0,255,255');
    expect(pixelAt(context, 100, 100)).toBe(WHITE);
  });

  it('respeita a ordem das marcas: a última fica por cima', () => {
    const context = createContext();
    const marks: readonly DrawingMark[] = [
      { kind: 'traco', color: '#ff0000', size: 60, points: [{ x: 100, y: 150 }] },
      { kind: 'traco', color: '#00ff00', size: 30, points: [{ x: 100, y: 150 }] },
    ];

    paintMarks(context, marks, 200, 300);

    expect(pixelAt(context, 100, 150)).toBe('0,255,0,255');
  });
});
