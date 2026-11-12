import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';

import { HATS, type HeroLook, PANTS_COLORS, SHIRT_COLORS } from '../../config/hero-look.config';
import { paintHero } from '../../engine/hero-painter';

/** Altura do desenho em blocos: o Pedro com o chapéu mais alto cabe com folga. */
const PREVIEW_HEIGHT_IN_TILES = 1.7;

/**
 * O Pedro parado, com a roupa escolhida, desenhado pelo mesmo pincel do jogo.
 *
 * Usar o mesmo desenho da partida garante que a roupa da prévia é a roupa que
 * aparece correndo na fase.
 */
@Component({
  selector: 'app-pedrere-hero-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas class="preview" role="img" [attr.aria-label]="label()"></canvas>`,
  styles: `
    :host {
      display: block;
      aspect-ratio: 3 / 4;
    }

    .preview {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class PedrereHeroPreview {
  readonly look = input.required<HeroLook>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  protected readonly label = computed(() => {
    const look = this.look();
    const shirt = SHIRT_COLORS.find((option) => option.id === look.shirt)?.label.toLowerCase();
    const pants = PANTS_COLORS.find((option) => option.id === look.pants)?.label.toLowerCase();
    const hat = HATS.find((option) => option.id === look.hat)?.label.toLowerCase();

    return `O Pedro de camisa ${shirt}, calça ${pants} e ${hat}.`;
  });

  constructor() {
    afterRenderEffect(() => this.paint(this.look()));
  }

  private paint(look: HeroLook): void {
    const canvas = this.canvas().nativeElement;
    const context = canvas.getContext('2d');

    if (!context || canvas.clientHeight === 0) {
      return;
    }

    const ratio = Math.min(2, window.devicePixelRatio || 1);

    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    const scale = canvas.clientHeight / PREVIEW_HEIGHT_IN_TILES;

    paintHero(context, look, {
      centerX: canvas.clientWidth / 2,
      feetY: canvas.clientHeight * 0.95,
      scale,
      facing: 1,
      motion: 'parado',
      timeSeconds: 0,
    });
  }
}
