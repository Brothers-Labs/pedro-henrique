import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PedrerePageFrame } from '../../components/pedrere-page-frame/pedrere-page-frame';
import { THEME_LABELS } from '../../engine/world-painter';
import { ADVENTURE_LEVELS } from '../../levels/adventure-levels';
import type { PedrereLevel } from '../../models/level.model';
import { PedrereLevelsService } from '../../services/pedrere-levels.service';
import { PedrereProgressService } from '../../services/pedrere-progress.service';

const THEME_EMOJIS: Readonly<Record<PedrereLevel['theme'], string>> = {
  campo: '🌳',
  praia: '🏖️',
  noite: '🌙',
  neve: '❄️',
};

/**
 * Aventuras: as fases prontas, com as estrelas já ganhas, e as fases que o
 * Pedro criou no modo maker logo embaixo.
 *
 * Todas as fases ficam abertas desde o começo: travar uma fase difícil
 * deixaria a criança presa sem poder brincar com as outras.
 */
@Component({
  selector: 'app-pedrere-adventures-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PedrerePageFrame],
  templateUrl: './pedrere-adventures-page.html',
  styleUrl: './pedrere-adventures-page.scss',
})
export class PedrereAdventuresPage {
  private readonly progress = inject(PedrereProgressService);
  private readonly levelsService = inject(PedrereLevelsService);

  protected readonly adventureLevels = ADVENTURE_LEVELS;
  protected readonly customLevels = this.levelsService.levels;
  protected readonly themeLabels = THEME_LABELS;
  protected readonly themeEmojis = THEME_EMOJIS;
  protected readonly starSlots = [1, 2, 3] as const;

  protected starsOf(levelId: string): number {
    return this.progress.starsOf(levelId);
  }

  protected remove(level: PedrereLevel): void {
    if (confirm(`Apagar a fase "${level.name}"?`)) {
      this.levelsService.remove(level.id);
    }
  }
}
