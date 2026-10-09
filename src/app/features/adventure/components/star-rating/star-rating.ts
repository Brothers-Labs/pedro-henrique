import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ADVENTURE_RULES } from '../../config/adventure-rules.config';

export type StarRatingSize = 'small' | 'medium' | 'large';

/**
 * Estrelas de uma fase.
 *
 * Cheia e vazia têm desenhos diferentes (★ e ☆), não só cores diferentes, e o
 * leitor de tela ouve "2 de 3 estrelas" em vez de três símbolos soltos.
 */
@Component({
  selector: 'app-star-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="stars" role="img" [attr.data-size]="size()" [attr.aria-label]="label()">
      @for (isFilled of slots(); track $index) {
        <span class="stars__star" [class.stars__star--filled]="isFilled" aria-hidden="true">{{ isFilled ? '★' : '☆' }}</span>
      }
    </span>
  `,
  styles: `
    .stars {
      display: inline-flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.1em;
      font-size: 1rem;
      line-height: 1;

      &[data-size='medium'] {
        font-size: 1.5rem;
      }

      &[data-size='large'] {
        font-size: 2.75rem;
      }

      &__star {
        color: var(--text-soft);

        &--filled {
          color: var(--color-yellow);
          -webkit-text-stroke: 1px var(--border-strong);
        }
      }
    }
  `,
})
export class StarRating {
  readonly stars = input.required<number>();
  readonly max = input<number>(ADVENTURE_RULES.stars.max);
  readonly size = input<StarRatingSize>('small');

  protected readonly slots = computed(() =>
    Array.from({ length: this.max() }, (_, index) => index < this.stars()),
  );

  protected readonly label = computed(() => `${this.stars()} de ${this.max()} estrelas`);
}
