import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { CommunicationCard } from '../../../core/models/communication.model';

/**
 * Faixa da frase em construção: mostra os cartões escolhidos e as ações
 * sobre eles. É puramente apresentacional — quem guarda a frase é a página.
 */
@Component({
  selector: 'app-phrase-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './phrase-bar.html',
  styleUrl: './phrase-bar.scss',
})
export class PhraseBar {
  readonly cards = input.required<readonly CommunicationCard[]>();
  readonly text = input.required<string>();
  readonly canSave = input.required<boolean>();
  readonly isSpeaking = input(false);

  readonly speakRequested = output<void>();
  readonly saveRequested = output<void>();
  readonly clearRequested = output<void>();
  readonly lastRemoved = output<void>();
  /** Índice do cartão que a criança tocou para tirar da frase. */
  readonly cardRemoved = output<number>();
}
