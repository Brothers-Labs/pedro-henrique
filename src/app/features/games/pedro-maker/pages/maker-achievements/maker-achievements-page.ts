import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { MakerPageFrame } from '../../components/maker-page-frame/maker-page-frame';
import { LOOK_OPTIONS } from '../../config/character.config';
import { MakerProgressService } from '../../services/maker-progress.service';

/**
 * Conquistas do Pedro Maker e a próxima recompensa de nível.
 *
 * Cada conquista mostra quanto falta, e não só se foi feita: "72 de 100
 * moedas" diz para a criança o que fazer em seguida.
 */
@Component({
  selector: 'app-maker-achievements-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MakerPageFrame],
  templateUrl: './maker-achievements-page.html',
  styleUrl: './maker-achievements-page.scss',
})
export class MakerAchievementsPage {
  private readonly progress = inject(MakerProgressService);

  protected readonly achievements = this.progress.achievements;
  protected readonly adventurer = this.progress.adventurer;
  protected readonly unlockedCount = computed(() => this.achievements().filter((entry) => entry.isUnlocked).length);

  /** A opção de visual mais próxima de ser liberada por nível. */
  protected readonly nextReward = computed(() => {
    const level = this.adventurer().level;

    return (
      [...LOOK_OPTIONS]
        .filter((option) => option.unlockLevel > level)
        .sort((first, second) => first.unlockLevel - second.unlockLevel)[0] ?? null
    );
  });

  protected percentage(current: number, goal: number): number {
    return goal <= 0 ? 100 : Math.round((current / goal) * 100);
  }
}
