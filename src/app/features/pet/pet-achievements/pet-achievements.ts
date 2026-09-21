import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { PetAchievementProgress } from '../../../core/models/pet.model';

/**
 * Conquistas do mascote.
 *
 * As bloqueadas ficam na lista, com o progresso parcial à vista: "14 de 20"
 * conta uma história melhor do que um cadeado mudo, e mostra que falta pouco.
 */
@Component({
  selector: 'app-pet-achievements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <ul class="achievements">
      @for (item of items(); track item.achievement.id) {
        <li>
          <article
            class="achievement"
            [attr.data-state]="item.isCompleted ? 'concluida' : 'bloqueado'"
          >
            <span class="achievement__emoji" aria-hidden="true">
              {{ item.isCompleted ? item.achievement.emoji : '🔒' }}
            </span>

            <div class="achievement__text">
              <h3 class="achievement__title">{{ item.achievement.title }}</h3>
              <p class="achievement__description">{{ item.achievement.description }}</p>

              @if (item.isCompleted) {
                <p class="achievement__date">
                  <span aria-hidden="true">🏅</span>
                  Conquistada em {{ item.completedAt | date: 'dd/MM/yyyy' }}
                </p>
              } @else {
                <div
                  class="achievement__bar"
                  role="progressbar"
                  [attr.aria-valuenow]="item.current"
                  aria-valuemin="0"
                  [attr.aria-valuemax]="item.goal"
                  [attr.aria-label]="
                    item.achievement.title + ': ' + item.current + ' de ' + item.goal
                  "
                >
                  <span class="achievement__fill" [style.width.%]="item.percentage"></span>
                </div>
                <p class="achievement__progress">{{ item.current }} de {{ item.goal }}</p>
              }
            </div>
          </article>
        </li>
      }
    </ul>
  `,
  styleUrl: './pet-achievements.scss',
})
export class PetAchievements {
  readonly items = input.required<readonly PetAchievementProgress[]>();
}
