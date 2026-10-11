import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { AdventureWorld, LevelView } from '../../models/adventure.model';
import { MapCompanion } from '../map-companion/map-companion';
import { StarRating } from '../star-rating/star-rating';

/**
 * Abertura da fase: a história, o objetivo e o mascote animando.
 *
 * Na fase do guardião, quem fala primeiro é ele. Quem está rejogando vê o
 * melhor resultado, que nunca diminui.
 */
@Component({
  selector: 'app-level-intro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapCompanion, StarRating],
  template: `
    @let level = view().level;

    <article class="intro" [attr.data-color]="world().color">
      <p class="intro__eyebrow">{{ world().emoji }} {{ world().name }} · Fase {{ view().order }}</p>
      <span class="intro__icon" aria-hidden="true">{{ level.guardian?.emoji ?? level.icon }}</span>
      <h2 class="intro__title" tabindex="-1" data-autofocus>{{ title() }}</h2>

      @if (level.guardian; as guardian) {
        <blockquote class="intro__guardian">
          <p>“{{ guardian.greeting }}”</p>
          <footer>— {{ guardian.name }}</footer>
        </blockquote>
      }

      <p class="intro__story">{{ story() }}</p>
      <p class="intro__objective"><span aria-hidden="true">🎯</span> {{ objective() }}</p>

      @if (view().record; as record) {
        <dl class="intro__best">
          <div>
            <dt>Melhor resultado</dt>
            <dd><app-star-rating [stars]="record.bestStars" size="medium" /></dd>
          </div>
          <div>
            <dt>Melhor pontuação</dt>
            <dd>{{ record.bestScore }} / {{ level.activity.questionCount }}</dd>
          </div>
          <div>
            <dt>Jogadas</dt>
            <dd>{{ record.attempts }}</dd>
          </div>
        </dl>
      }

      <app-map-companion [line]="companionLine()" size="pequeno" mood="feliz" />

      <button type="button" class="button button--primary button--block intro__start" (click)="started.emit()">
        <span aria-hidden="true">{{ view().record ? '🔁' : '🚀' }}</span>
        {{ view().record ? 'Jogar novamente' : 'Começar' }}
      </button>
    </article>
  `,
  styleUrl: './level-intro.scss',
})
export class LevelIntro {
  readonly world = input.required<AdventureWorld>();
  readonly view = input.required<LevelView>();
  /** Textos já com os nomes preenchidos por quem abre a fase. */
  readonly title = input.required<string>();
  readonly story = input.required<string>();
  readonly objective = input.required<string>();
  readonly companionLine = input.required<string>();

  readonly started = output<void>();
}
