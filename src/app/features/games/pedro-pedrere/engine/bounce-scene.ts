import { type BouncePad, BounceSimulation, BOUNCE_VIEW_HEIGHT, BOUNCE_WORLD_WIDTH, type PadKind } from '../simulation/bounce-simulation';
import { INK, paintHero, roundedRect } from './hero-painter';
import type { PedrereScene, SceneOptions } from './scene';
import { paintBackground } from './world-painter';

export interface BounceSceneOptions extends SceneOptions {
  readonly seed: number;
}

const PAD_COLORS: Readonly<Record<PadKind, string>> = {
  normal: '#ff5fa2',
  super: '#ffcf3f',
  nuvem: '#ffffff',
};

/** Pula-pula na tela: uma faixa de céu da largura do mundo, que sobe junto com o Pedro. */
export function createBounceScene(options: BounceSceneOptions): PedrereScene {
  const simulation = new BounceSimulation(options.seed);
  const { hero } = simulation;

  return {
    controls: 'pula-pula',
    description: 'Pula-pula: o Pedro quica de cama elástica em cama elástica, subindo cada vez mais alto.',
    step: (controls) => simulation.step(controls),
    result: () => simulation.result(),
    banner: () => null,
    hud: () => [{ id: 'altura', emoji: '📏', label: 'Altura', value: `${simulation.heightMeters} m` }],
    paint: (context, width, height, timeSeconds) => {
      const scale = Math.min(height / BOUNCE_VIEW_HEIGHT, width / BOUNCE_WORLD_WIDTH);
      const left = (width - BOUNCE_WORLD_WIDTH * scale) / 2;
      const top = simulation.cameraTop;
      const toScreenY = (worldY: number): number => (worldY - top) * scale + (height - BOUNCE_VIEW_HEIGHT * scale);

      paintBackground(context, skyThemeAt(simulation.heightMeters), width, height, -top * scale * 0.2);

      context.save();
      context.beginPath();
      context.rect(left, 0, BOUNCE_WORLD_WIDTH * scale, height);
      context.clip();

      for (const pad of simulation.pads) {
        if (!pad.isBroken) {
          paintPad(context, pad, left + pad.x * scale, toScreenY(pad.y), scale);
        }
      }

      // O mundo dá a volta: perto da borda, o Pedro aparece pela metade dos dois lados.
      for (const wrapOffset of [-BOUNCE_WORLD_WIDTH, 0, BOUNCE_WORLD_WIDTH]) {
        paintHero(context, options.look, {
          centerX: left + (hero.x + wrapOffset + hero.width / 2) * scale,
          feetY: toScreenY(hero.y + hero.height),
          scale,
          facing: simulation.facing,
          motion: 'no-ar',
          timeSeconds,
        });
      }

      context.restore();
      paintSideWalls(context, left, width, height);
    },
  };
}

/** O céu escurece conforme o Pedro sobe: do campo para a noite estrelada. */
function skyThemeAt(heightMeters: number): 'campo' | 'noite' {
  return heightMeters < 80 ? 'campo' : 'noite';
}

function paintPad(context: CanvasRenderingContext2D, pad: BouncePad, x: number, y: number, scale: number): void {
  const width = pad.width * scale;
  const height = scale * 0.32;

  roundedRect(context, x, y, width, height, height / 2);
  context.fillStyle = PAD_COLORS[pad.kind];
  context.fill();
  context.lineWidth = Math.max(1, scale * 0.06);
  context.strokeStyle = pad.kind === 'nuvem' ? '#a9c4dc' : INK;
  context.stroke();

  if (pad.kind === 'super') {
    context.fillStyle = INK;
    context.font = `800 ${Math.round(scale * 0.3)}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('★', x + width / 2, y + height / 2);
  }
}

/** Faixas laterais em telas largas, para a borda do mundo não parecer um erro de desenho. */
function paintSideWalls(context: CanvasRenderingContext2D, left: number, width: number, height: number): void {
  if (left <= 0) {
    return;
  }

  context.fillStyle = 'rgb(42 35 80 / 25%)';
  context.fillRect(0, 0, left, height);
  context.fillRect(width - left, 0, left, height);
}
