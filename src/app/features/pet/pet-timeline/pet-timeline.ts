import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { PetEvent } from '../../../core/models/pet.model';

/**
 * Linha do tempo da amizade.
 *
 * Guarda só marcos: a adoção, as evoluções, as conquistas, os acessórios e os
 * níveis redondos. Registrar cada desafio transformaria a memória em extrato
 * bancário — e ninguém relê um extrato com carinho.
 */
@Component({
  selector: 'app-pet-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    @if (events().length === 0) {
      <p class="timeline__empty">
        <span aria-hidden="true">📗</span>
        A aventura de vocês está só começando. Jogue um pouquinho e os momentos
        importantes vão aparecer aqui!
      </p>
    }

    <ol class="timeline">
      @for (event of events(); track event.id) {
        <li class="timeline__item">
          <span class="timeline__emoji" aria-hidden="true">{{ event.emoji }}</span>
          <span class="timeline__text">
            <strong class="timeline__description">{{ event.description }}</strong>
            <time class="timeline__date" [attr.datetime]="event.createdAt">
              {{ event.createdAt | date: 'dd/MM' }}
            </time>
          </span>
        </li>
      }
    </ol>
  `,
  styleUrl: './pet-timeline.scss',
})
export class PetTimeline {
  readonly events = input.required<readonly PetEvent[]>();
}
