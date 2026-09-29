import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LevelThumbnail } from '../../components/level-thumbnail/level-thumbnail';
import { MakerPageFrame } from '../../components/maker-page-frame/maker-page-frame';
import { THEME_LABELS } from '../../config/object-catalog';
import type { CustomLevel } from '../../models/level.model';
import { CustomLevelService } from '../../services/custom-level.service';

/**
 * Minhas fases: tudo o que o Pedro criou no editor.
 *
 * Cada cartão joga, edita, duplica ou exclui a fase. Excluir pede
 * confirmação, porque não tem volta.
 */
@Component({
  selector: 'app-maker-levels-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, MakerPageFrame, LevelThumbnail],
  templateUrl: './maker-levels-page.html',
  styleUrl: './maker-levels-page.scss',
})
export class MakerLevelsPage {
  private readonly customLevels = inject(CustomLevelService);

  protected readonly levels = this.customLevels.levels;
  protected readonly status = this.customLevels.status;
  protected readonly isEmpty = this.customLevels.isEmpty;
  protected readonly busyId = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    void this.customLevels.load();
  }

  protected themeOf(level: CustomLevel): string {
    const theme = THEME_LABELS[level.theme];

    return `${theme.emoji} ${theme.label}`;
  }

  protected starsOf(level: CustomLevel): readonly boolean[] {
    return [1, 2, 3].map((position) => position <= level.bestStars);
  }

  protected async duplicate(level: CustomLevel): Promise<void> {
    await this.run(level.id, () => this.customLevels.duplicate(level.id), 'Não foi possível duplicar a fase.');
  }

  protected async remove(level: CustomLevel): Promise<void> {
    if (!confirm(`Excluir a fase "${level.name}"? Ela não volta mais.`)) {
      return;
    }

    await this.run(level.id, () => this.customLevels.remove(level.id), 'Não foi possível excluir a fase.');
  }

  protected retry(): void {
    void this.customLevels.load();
  }

  private async run(id: string, action: () => Promise<unknown>, failure: string): Promise<void> {
    this.busyId.set(id);
    this.errorMessage.set(null);

    try {
      await action();
    } catch (error) {
      console.error(`Pedro Maker: ${failure}`, error);
      this.errorMessage.set(failure);
    } finally {
      this.busyId.set(null);
    }
  }
}
