import { type LevelTheme, TILE } from '../models/level.model';
import { Pebble } from '../simulation/pebble';
import { INK } from './hero-painter';
import {
  paintBackground,
  paintCheckpoint,
  paintCoin,
  paintGoal,
  paintPebble,
  paintStartMarker,
  paintTile,
  type WorldCamera,
} from './world-painter';

/**
 * Desenha a fase do editor inteira, do jeito que ela vai aparecer no jogo.
 *
 * Não passa pela leitura da fase (`layoutLevel`) de propósito: no meio da
 * criação a fase pode estar sem início ou sem chegada, e o editor precisa
 * mostrar mesmo assim.
 */
export function paintEditorLevel(
  context: CanvasRenderingContext2D,
  rows: readonly string[],
  theme: LevelTheme,
  cell: number,
): void {
  const width = (rows[0]?.length ?? 0) * cell;
  const height = rows.length * cell;
  const camera: WorldCamera = { scale: cell, left: 0, offsetY: 0 };

  paintBackground(context, theme, width, height, 0);

  rows.forEach((line, row) => {
    [...line].forEach((tile, column) => {
      const x = column * cell;
      const y = row * cell;
      const point = { column, row };

      switch (tile) {
        case TILE.ground:
          paintTile(context, 'ground', theme, rows[row - 1]?.[column] !== TILE.ground, x, y, cell);
          break;
        case TILE.brick:
          paintTile(context, 'brick', theme, false, x, y, cell);
          break;
        case TILE.trampoline:
          paintTile(context, 'trampoline', theme, false, x, y, cell);
          break;
        case TILE.spike:
          paintTile(context, 'spike', theme, false, x, y, cell);
          break;
        case TILE.coin:
          paintCoin(context, x, y, cell, 0);
          break;
        case TILE.pebble:
          paintPebble(context, new Pebble(point).body, camera, -1, false);
          break;
        case TILE.checkpoint:
          paintCheckpoint(context, point, camera, false);
          break;
        case TILE.goal:
          paintGoal(context, point, camera);
          break;
        case TILE.start:
          paintStartMarker(context, x, y, cell);
          break;
      }
    });
  });

  paintGridLines(context, width, height, cell);
}

function paintGridLines(context: CanvasRenderingContext2D, width: number, height: number, cell: number): void {
  context.save();
  context.strokeStyle = INK;
  context.globalAlpha = 0.12;
  context.lineWidth = 1;
  context.beginPath();

  for (let x = 0; x <= width; x += cell) {
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, height);
  }

  for (let y = 0; y <= height; y += cell) {
    context.moveTo(0, y + 0.5);
    context.lineTo(width, y + 0.5);
  }

  context.stroke();
  context.restore();
}
