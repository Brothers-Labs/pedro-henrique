import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { SprunkAccessory, SprunkCharacter } from '../../models/sprunk.model';

export type SprunkFigureVariant = 'full' | 'icon';

/** Acessórios que ficam atrás da cabeça, como orelhas e chifres. */
const BACK_ACCESSORIES: ReadonlySet<SprunkAccessory> = new Set<SprunkAccessory>([
  'spikes',
  'antennas',
  'sprout',
  'cat-ears',
  'bear-ears',
  'sun-rays',
  'horns',
  'bunny-ears',
]);

const VIEW_BOXES: Readonly<Record<SprunkCharacter['shape'], Readonly<Record<SprunkFigureVariant, string>>>> = {
  classic: { full: '0 0 120 200', icon: '0 0 120 124' },
  'iron-ball': { full: '0 0 120 200', icon: '22 72 100 100' },
};

const HEAD_CENTER_X = 60;
const HEAD_CENTER_Y = 78;

/** Oito raios de sol em volta da cabeça, calculados uma vez só. */
const SUN_RAYS: readonly string[] = Array.from({ length: 8 }, (_, index) => {
  const angle = (index / 8) * Math.PI * 2;
  const point = (radius: number, offset: number): string => {
    const x = HEAD_CENTER_X + Math.cos(angle + offset) * radius;
    const y = HEAD_CENTER_Y + Math.sin(angle + offset) * radius;

    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  return [point(34, -0.22), point(56, 0), point(34, 0.22)].join(' ');
});

/**
 * Desenho de um boneco do Pedro Sprunks, em SVG.
 *
 * Todos os bonecos saem do mesmo molde — cabeça redonda, corpo de pino — e
 * mudam por cor, olhos e acessório. É isso que permite ao Pedro criar os
 * próprios bonecos sem desenhar nada: escolher as peças já basta.
 *
 * `isSinging` faz o boneco dançar no tempo da música; `isActing` dispara a
 * ação especial dele quando é tocado.
 */
@Component({
  selector: 'app-sprunk-figure',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  templateUrl: './sprunk-figure.html',
  styleUrl: './sprunk-figure.scss',
  host: {
    '[class.is-icon]': "variant() === 'icon'",
    '[class.is-singing]': 'isSinging()',
    '[attr.data-action]': 'isActing() ? character().action : null',
  },
})
export class SprunkFigure {
  readonly character = input.required<SprunkCharacter>();
  readonly variant = input<SprunkFigureVariant>('full');
  readonly isSinging = input(false);
  readonly isActing = input(false);

  protected readonly sunRays = SUN_RAYS;

  protected readonly viewBox = computed(() => VIEW_BOXES[this.character().shape][this.variant()]);
  protected readonly accessoryLayer = computed(() =>
    BACK_ACCESSORIES.has(this.character().accessory) ? 'back' : 'front',
  );
}
