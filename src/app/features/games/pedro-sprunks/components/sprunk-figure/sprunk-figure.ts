import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { SprunkAccessory, SprunkCharacter, SprunkCostume } from '../../models/sprunk.model';

export type SprunkFigureVariant = 'full' | 'icon';

/**
 * Acessórios que ficam atrás da cabeça, como orelhas e chifres. Os bigodes
 * também: a cabeça esconde a raiz e só as pontas aparecem nas bochechas.
 */
const BACK_ACCESSORIES: ReadonlySet<SprunkAccessory> = new Set<SprunkAccessory>([
  'spikes',
  'antennas',
  'sprout',
  'cat-ears',
  'bear-ears',
  'sun-rays',
  'horns',
  'bunny-ears',
  'flower-hair',
  'tall-ears',
  'big-spikes',
  'wacky-ears',
  'tree-crown',
  'antenna-ears',
  'cat-whiskers',
  'bunny-bow',
  'hood',
]);

/**
 * Em que camada a fantasia é desenhada: a capa fica atrás do corpo, o que se
 * veste no tronco fica sobre o corpo e debaixo da cabeça, e o que se usa no
 * pescoço fica na frente do queixo.
 */
type CostumeLayer = 'back' | 'body' | 'neck';

const COSTUME_LAYERS: Readonly<Record<SprunkCostume, CostumeLayer>> = {
  none: 'body',
  cape: 'back',
  overalls: 'body',
  stripes: 'body',
  skeleton: 'body',
  drum: 'body',
  bowtie: 'neck',
  tie: 'neck',
  scarf: 'neck',
};

const VIEW_BOXES: Readonly<Record<SprunkCharacter['shape'], Readonly<Record<SprunkFigureVariant, string>>>> = {
  classic: { full: '0 0 120 200', icon: '0 0 120 124' },
  'iron-ball': { full: '0 0 120 200', icon: '22 72 100 100' },
  head: { full: '0 0 120 200', icon: '0 0 120 124' },
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

interface FlowerSpot {
  readonly x: number;
  readonly y: number;
}

/** Flores do cabelo, só onde o cabelo passa da cabeça e a flor fica à vista. */
const HAIR_FLOWERS: readonly FlowerSpot[] = [
  { x: 26, y: 50 },
  { x: 60, y: 30 },
  { x: 94, y: 50 },
  { x: 16, y: 84 },
  { x: 104, y: 84 },
];

const BODY_TOP_Y = 104;
const BODY_BOTTOM_Y = 196;
const BODY_TOP_HALF_WIDTH = 20;
const BODY_BOTTOM_HALF_WIDTH = 28;

/** Metade da largura do corpo de pino numa altura: ele alarga em direção aos pés. */
function bodyHalfWidth(y: number): number {
  const progress = (y - BODY_TOP_Y) / (BODY_BOTTOM_Y - BODY_TOP_Y);

  return BODY_TOP_HALF_WIDTH + (BODY_BOTTOM_HALF_WIDTH - BODY_TOP_HALF_WIDTH) * progress;
}

/** Faixa horizontal que acompanha as bordas do corpo, um pouco para dentro do contorno. */
function bodyBand(top: number, bottom: number, inset: number): string {
  const topHalf = bodyHalfWidth(top) - inset;
  const bottomHalf = bodyHalfWidth(bottom) - inset;
  const corners: readonly (readonly [number, number])[] = [
    [HEAD_CENTER_X - topHalf, top],
    [HEAD_CENTER_X + topHalf, top],
    [HEAD_CENTER_X + bottomHalf, bottom],
    [HEAD_CENTER_X - bottomHalf, bottom],
  ];

  return corners.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

/** Listras da fantasia listrada, calculadas uma vez só. */
const STRIPES: readonly string[] = [128, 152, 176].map((top) => bodyBand(top, top + 12, 1.5));

/** Barra da jardineira, do meio do corpo até os pés. */
const OVERALLS_LEGS = bodyBand(158, BODY_BOTTOM_Y - 1.5, 1.5);

interface Rib {
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
}

/** Costelas da fantasia de esqueleto, cada vez mais largas como o corpo. */
const RIBS: readonly Rib[] = [132, 146, 160].map((y) => {
  const half = bodyHalfWidth(y) - 7;

  return { x1: HEAD_CENTER_X - half, x2: HEAD_CENTER_X + half, y };
});

/** Abaixo deste brilho (de 0 a 1), a tinta escura do rosto quase some sobre o corpo. */
const DARK_LUMA = 0.3;

/** Cor `#rrggbb` escura, pela luma (pesos Rec. 709) dos canais sRGB. */
export function isDarkColor(hexColor: string): boolean {
  const channel = (offset: number): number => Number.parseInt(hexColor.slice(offset, offset + 2), 16) / 255;
  const luma = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);

  return luma < DARK_LUMA;
}

/**
 * Desenho de um boneco do Pedro Sprunks, em SVG.
 *
 * Todos os bonecos saem do mesmo molde — cabeça redonda, corpo de pino — e
 * mudam por cor, olhos, acessório e fantasia. É isso que permite ao Pedro criar os
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
    '[class.is-dark]': 'isDarkBody()',
    '[attr.data-action]': 'isActing() ? character().action : null',
  },
})
export class SprunkFigure {
  readonly character = input.required<SprunkCharacter>();
  readonly variant = input<SprunkFigureVariant>('full');
  readonly isSinging = input(false);
  readonly isActing = input(false);

  protected readonly sunRays = SUN_RAYS;
  protected readonly stripes = STRIPES;
  protected readonly overallsLegs = OVERALLS_LEGS;
  protected readonly ribs = RIBS;
  protected readonly hairFlowers = HAIR_FLOWERS;

  protected readonly viewBox = computed(() => VIEW_BOXES[this.character().shape][this.variant()]);
  protected readonly accessoryLayer = computed(() =>
    BACK_ACCESSORIES.has(this.character().accessory) ? 'back' : 'front',
  );
  protected readonly costumeLayer = computed(() => COSTUME_LAYERS[this.character().costume]);
  /** A cabeça sozinha não tem corpo, então também não veste fantasia. */
  protected readonly hasBody = computed(() => this.character().shape !== 'head');
  /** Corpo escuro da turma da noite: o rosto troca a tinta escura por uma clara para continuar visível. */
  protected readonly isDarkBody = computed(() => isDarkColor(this.character().color));
}
