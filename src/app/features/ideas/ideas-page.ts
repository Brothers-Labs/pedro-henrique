import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { IDEA_STATUS_OPTIONS, IDEAS } from '../../core/data/ideas.data';
import type { IdeaStatus } from '../../core/models/idea.model';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageIntro } from '../../shared/components/page-intro/page-intro';
import { RevealDirective } from '../../shared/directives/reveal.directive';

const REVEAL_STEP_IN_MS = 80;

@Component({
  selector: 'app-ideas-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageIntro, EmptyState, RevealDirective],
  templateUrl: './ideas-page.html',
  styleUrl: './ideas-page.scss',
})
export class IdeasPage {
  protected readonly statusOptions = IDEA_STATUS_OPTIONS;
  protected readonly activeStatus = signal<IdeaStatus | null>(null);

  protected readonly ideas = computed(() => {
    const status = this.activeStatus();
    return status === null ? IDEAS : IDEAS.filter((idea) => idea.status === status);
  });

  /** Alterna o filtro: clicar no status já ativo volta a mostrar tudo. */
  protected toggleStatus(status: IdeaStatus): void {
    this.activeStatus.update((current) => (current === status ? null : status));
  }

  protected statusLabel(status: IdeaStatus): string {
    return IDEA_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
  }

  protected statusEmoji(status: IdeaStatus): string {
    return IDEA_STATUS_OPTIONS.find((option) => option.value === status)?.emoji ?? '💡';
  }

  protected revealDelay(index: number): number {
    return index * REVEAL_STEP_IN_MS;
  }
}
