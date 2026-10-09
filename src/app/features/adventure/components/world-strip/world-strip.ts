import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { WorldStatus, WorldView } from '../../models/adventure.model';

const STATUS_LABELS: Readonly<Record<WorldStatus, string>> = {
  locked: 'Trancado',
  'coming-soon': 'Em breve',
  'in-progress': 'Em andamento',
  completed: 'Concluído',
};

const STATUS_BADGES: Readonly<Record<WorldStatus, string>> = {
  locked: '🔒',
  'coming-soon': '⏳',
  'in-progress': '🚩',
  completed: '✓',
};

/**
 * Mapa-múndi da jornada: os mundos em ordem, ligados por uma estrada.
 *
 * Tocar num mundo abre os detalhes dele. Cada um traz um selo além da cor —
 * cadeado, bandeira ou "✓" — para que a situação nunca dependa só da cor.
 */
@Component({
  selector: 'app-world-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="strip" aria-label="Mundos da aventura">
      <ol class="strip__list">
        @for (view of worlds(); track view.world.id) {
          <li class="strip__item" [attr.data-status]="view.status">
            <button
              type="button"
              class="strip__world"
              [attr.data-color]="view.world.color"
              [attr.aria-current]="view.world.id === selectedId() ? 'true' : null"
              [attr.aria-label]="view.world.name + ': ' + statusLabel(view.status)"
              (click)="selected.emit(view)"
            >
              <span class="strip__emoji" aria-hidden="true">{{ view.world.emoji }}</span>
              <span class="strip__badge" aria-hidden="true">{{ statusBadge(view.status) }}</span>
            </button>
            <span class="strip__name" aria-hidden="true">{{ view.world.name }}</span>
          </li>
        }
      </ol>
    </nav>
  `,
  styleUrl: './world-strip.scss',
})
export class WorldStrip {
  readonly worlds = input.required<readonly WorldView[]>();
  readonly selectedId = input<string | null>(null);

  readonly selected = output<WorldView>();

  protected statusLabel(status: WorldStatus): string {
    return STATUS_LABELS[status];
  }

  protected statusBadge(status: WorldStatus): string {
    return STATUS_BADGES[status];
  }
}
