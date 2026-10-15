import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { MissionCard } from '../../components/mission-card';
import { MISSION_CATEGORY_LABEL } from '../../config/missions.config';
import type { MissionCategory } from '../../models/economy.model';
import { AventuraStore } from '../../services/aventura-store.service';

const CATEGORY_ORDER: readonly MissionCategory[] = ['daily', 'weekly', 'season', 'special'];

const CATEGORY_HINT: Readonly<Record<MissionCategory, string>> = {
  daily: 'Recomeçam todo dia, sempre as mesmas.',
  weekly: 'Recomeçam toda segunda-feira.',
  season: 'Valem até o fim da temporada.',
  special: 'Só durante o evento Corrida Noturna.',
};

/** Todas as missões, separadas por diárias, semanais, de temporada e especiais. */
@Component({
  selector: 'app-missions-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MissionCard],
  template: `
    <div class="page">
      <header class="page__header">
        <h1 class="page__title">Missões</h1>
        <p class="page__lead">Cada fase jogada faz as missões andarem. Missão completa? Toque em Resgatar.</p>
      </header>

      @for (group of groups(); track group.category) {
        <section class="group" [attr.aria-labelledby]="'missoes-' + group.category">
          <h2 class="group__title" [id]="'missoes-' + group.category">{{ group.label }}</h2>
          <p class="group__hint">{{ group.hint }}</p>
          <div class="group__list">
            @for (entry of group.missions; track entry.mission.id) {
              <app-mission-card [status]="entry" [showExpiry]="true" />
            }
          </div>
        </section>
      }
    </div>
  `,
  styleUrl: '../page.scss',
})
export class MissionsPage {
  private readonly store = inject(AventuraStore);

  protected readonly groups = computed(() => {
    const missions = this.store.missions();

    return CATEGORY_ORDER.map((category) => ({
      category,
      label: MISSION_CATEGORY_LABEL[category],
      hint: CATEGORY_HINT[category],
      missions: missions.filter((entry) => entry.mission.category === category),
    }));
  });
}
