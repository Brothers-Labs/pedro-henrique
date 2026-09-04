import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type {
  IqAttentionChallenge,
  IqChallenge,
  IqFigureChallenge,
  IqMemoryChallenge,
  IqTokenChallenge,
} from '../../../../core/models/iq-game.model';

/** Situação da resposta; `aguardando` é o único estado em que dá para clicar. */
export type IqAnswerStatus = 'aguardando' | 'certo' | 'errado';

/** Etapa da memória: primeiro a sequência aparece, depois vem a pergunta. */
export type IqChallengePhase = 'memorizando' | 'respondendo';

/**
 * Desenha o desafio atual, seja ele de peças, figuras, memória ou atenção.
 *
 * É um componente só de apresentação: recebe o desafio pronto e avisa o pai
 * qual alternativa a criança escolheu.
 */
@Component({
  selector: 'app-challenge-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './challenge-view.html',
  styleUrl: './challenge-view.scss',
})
export class ChallengeView {
  readonly challenge = input.required<IqChallenge>();
  readonly phase = input.required<IqChallengePhase>();
  readonly status = input.required<IqAnswerStatus>();
  /** Alternativa escolhida, para marcar o erro sem esconder a resposta certa. */
  readonly chosenIndex = input<number | null>(null);

  readonly answered = output<number>();

  protected readonly tokenChallenge = computed<IqTokenChallenge | null>(() => {
    const challenge = this.challenge();
    return challenge.format === 'tokens' ? challenge : null;
  });

  protected readonly figureChallenge = computed<IqFigureChallenge | null>(() => {
    const challenge = this.challenge();
    return challenge.format === 'figuras' ? challenge : null;
  });

  protected readonly memoryChallenge = computed<IqMemoryChallenge | null>(() => {
    const challenge = this.challenge();
    return challenge.format === 'memoria' ? challenge : null;
  });

  protected readonly attentionChallenge = computed<IqAttentionChallenge | null>(() => {
    const challenge = this.challenge();
    return challenge.format === 'atencao' ? challenge : null;
  });

  /** Colunas da grade de atenção, calculadas aqui para o template ficar limpo. */
  protected readonly gridTemplateColumns = computed(() => {
    const columns = this.attentionChallenge()?.columns ?? 1;
    return `repeat(${columns}, minmax(0, 1fr))`;
  });

  protected readonly isMemorizing = computed(
    () => this.phase() === 'memorizando' && this.memoryChallenge() !== null,
  );

  protected readonly isLocked = computed(
    () => this.status() !== 'aguardando' || this.isMemorizing(),
  );

  /**
   * Aparência da alternativa depois da resposta.
   *
   * A certa sempre acende, mesmo quando a criança errou: ver a resposta faz
   * parte do aprendizado e evita que ela fique só com a marca do erro.
   */
  protected optionState(index: number): 'certa' | 'errada' | 'idle' {
    if (this.status() === 'aguardando') {
      return 'idle';
    }
    if (index === this.challenge().correctIndex) {
      return 'certa';
    }

    return index === this.chosenIndex() ? 'errada' : 'idle';
  }

  protected choose(index: number): void {
    if (!this.isLocked()) {
      this.answered.emit(index);
    }
  }
}
