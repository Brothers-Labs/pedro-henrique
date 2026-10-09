import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ADVENTURE_WORLDS } from '../../config/adventure-worlds.config';
import { COMPANION_LINES } from '../../config/companion-lines.config';
import type { WorldView } from '../../models/adventure.model';
import { StarRating } from '../star-rating/star-rating';

/**
 * Detalhes de um mundo, num `<dialog>` nativo.
 *
 * O navegador cuida da prisão de foco, do `Esc` e de devolver o foco ao mundo
 * tocado. O conteúdo muda com a situação: progresso e prêmio para os mundos
 * abertos, o caminho até ele para os trancados.
 */
@Component({
  selector: 'app-world-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StarRating],
  templateUrl: './world-details.html',
  styleUrl: './world-details.scss',
})
export class WorldDetails {
  /** Mundo aberto; `null` mantém o painel fechado. */
  readonly view = input<WorldView | null>(null);

  readonly closed = output<void>();
  /** Pede para mostrar a trilha deste mundo no mapa. */
  readonly shown = output<WorldView>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly comingSoonLine = COMPANION_LINES.comingSoon;

  protected readonly percentage = computed(() => {
    const current = this.view();

    return current && current.levels.length > 0
      ? Math.round((current.completedLevels / current.levels.length) * 100)
      : 0;
  });

  /** Nome do mundo que precisa ser concluído antes deste. */
  protected readonly requirement = computed(() => {
    const unlock = this.view()?.world.unlock;

    if (unlock?.kind !== 'world-completed') {
      return null;
    }

    return ADVENTURE_WORLDS.find((world) => world.id === unlock.worldId)?.name ?? null;
  });

  constructor() {
    effect(() => {
      const isOpen = this.view() !== null;
      const element = this.dialog().nativeElement;

      if (isOpen && !element.open) {
        element.showModal();
        return;
      }

      if (!isOpen && element.open) {
        element.close();
      }
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  protected show(view: WorldView): void {
    this.shown.emit(view);
  }
}
