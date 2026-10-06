import { context2d } from '../../pedro-maker/art/canvas';
import type { Circuit } from '../simulation/circuit';
import type { Kart } from '../simulation/kart';

const PADDING = 8;

/**
 * O mapinha da pista no canto da tela, com um pontinho para cada kart.
 *
 * O traçado é calculado uma vez; a cada quadro só os pontinhos mudam.
 */
export class Minimap {
  private readonly context: CanvasRenderingContext2D;
  private readonly path = new Path2D();
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly circuit: Circuit,
    private readonly roadColor: string,
  ) {
    this.context = context2d(canvas);
    this.layout();
  }

  draw(karts: readonly Kart[], colors: ReadonlyMap<string, string>): void {
    const { context, canvas } = this;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    context.lineWidth = 9;
    context.stroke(this.path);
    context.strokeStyle = this.roadColor;
    context.lineWidth = 5;
    context.stroke(this.path);

    // O Pedro é desenhado por último, para nunca ficar escondido atrás de outro kart.
    const ordered = [...karts].sort((first, second) => Number(first.isPlayer) - Number(second.isPlayer));

    for (const kart of ordered) {
      const radius = kart.isPlayer ? 6 : 4;

      context.beginPath();
      context.arc(this.toX(kart.x), this.toY(kart.z), radius, 0, Math.PI * 2);
      context.fillStyle = colors.get(kart.id) ?? '#ffffff';
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = kart.isPlayer ? '#ffffff' : '#2a2350';
      context.stroke();
    }
  }

  private layout(): void {
    const { samples, worldWidth, worldDepth } = this.circuit;
    const width = this.canvas.width - PADDING * 2;
    const height = this.canvas.height - PADDING * 2;

    this.scale = Math.min(width / worldWidth, height / worldDepth);
    this.offsetX = PADDING + (width - worldWidth * this.scale) / 2;
    this.offsetY = PADDING + (height - worldDepth * this.scale) / 2;

    samples.forEach((sample, index) => {
      if (index === 0) {
        this.path.moveTo(this.toX(sample.x), this.toY(sample.z));
      } else {
        this.path.lineTo(this.toX(sample.x), this.toY(sample.z));
      }
    });
    this.path.closePath();
  }

  private toX(x: number): number {
    return this.offsetX + x * this.scale;
  }

  private toY(z: number): number {
    return this.offsetY + z * this.scale;
  }
}
