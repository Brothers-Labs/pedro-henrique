import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { AdventureQuestion } from '../../engine/question-factory';

type OptionState = 'certa' | 'errada' | 'neutra';

/**
 * Uma pergunta da fase, com a trilha de pedras mostrando quanto falta.
 *
 * Não há relógio: a criança responde no tempo dela, e só sai da pergunta
 * quando toca em "Próxima". A resposta trava no primeiro toque.
 */
@Component({
  selector: 'app-level-question',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './level-question.html',
  styleUrl: './level-question.scss',
})
export class LevelQuestion {
  readonly question = input.required<AdventureQuestion>();
  /** Posição da pergunta, começando em 1. */
  readonly position = input.required<number>();
  readonly total = input.required<number>();
  /** Alternativa tocada; `null` enquanto a criança pensa. */
  readonly selected = input<string | null>(null);
  readonly companionName = input<string>('Seu mascote');
  readonly companionLine = input<string | null>(null);

  readonly chosen = output<string>();
  readonly advanced = output<void>();

  protected readonly hasAnswered = computed(() => this.selected() !== null);
  protected readonly isCorrect = computed(() => this.selected() === this.question().answer);
  protected readonly isLast = computed(() => this.position() >= this.total());

  protected readonly steps = computed(() =>
    Array.from({ length: this.total() }, (_, index) => {
      const step = index + 1;

      return step < this.position() || (step === this.position() && this.hasAnswered()) ? 'feita' : step === this.position() ? 'atual' : 'futura';
    }),
  );

  protected optionState(option: string): OptionState {
    if (!this.hasAnswered()) {
      return 'neutra';
    }

    if (option === this.question().answer) {
      return 'certa';
    }

    return option === this.selected() ? 'errada' : 'neutra';
  }

  protected choose(option: string): void {
    if (!this.hasAnswered()) {
      this.chosen.emit(option);
    }
  }
}
