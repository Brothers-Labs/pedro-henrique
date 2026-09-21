import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { fillNames, PET_INTERACTIONS, petInteraction } from '../../../core/data/pet.data';
import type { PetInteractionId } from '../../../core/models/pet.model';

/**
 * Tempo em que os botões ficam travados depois de uma brincadeira.
 *
 * Existe por dois motivos: a mensagem precisa durar tempo suficiente para ser
 * lida, e um toque duplo não pode valer por duas brincadeiras na contagem da
 * conquista "Melhor amigo".
 */
const COOLDOWN_IN_MS = 1600;

/**
 * Brincadeiras com o mascote.
 *
 * Só apresenta e avisa: quem muda o estado é a página, e quem guarda a regra é
 * o serviço. Aqui ficam apenas o toque, a espera curta e a frase de retorno.
 */
@Component({
  selector: 'app-pet-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="actions">
      <ul class="actions__list">
        @for (action of interactions; track action.id) {
          <li>
            <button
              type="button"
              class="actions__button"
              [class.actions__button--active]="lastPlayed() === action.id"
              [disabled]="isBusy()"
              (click)="play(action.id)"
            >
              <span class="actions__emoji" aria-hidden="true">{{ action.emoji }}</span>
              {{ action.label }}
            </button>
          </li>
        }
      </ul>

      <p class="actions__feedback" role="status" aria-live="polite">
        @if (feedback(); as message) {
          <span aria-hidden="true">💛</span>
          {{ message }}
        } @else {
          <span aria-hidden="true">👆</span>
          Escolha uma brincadeira!
        }
      </p>
    </div>
  `,
  styleUrl: './pet-actions.scss',
})
export class PetActions {
  readonly petName = input.required<string>();
  readonly played = output<PetInteractionId>();

  protected readonly interactions = PET_INTERACTIONS;
  protected readonly feedback = signal('');
  protected readonly lastPlayed = signal<PetInteractionId | null>(null);
  protected readonly isBusy = signal(false);

  private cooldown: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearCooldown());
  }

  protected play(id: PetInteractionId): void {
    if (this.isBusy()) {
      return;
    }

    const interaction = petInteraction(id);

    this.isBusy.set(true);
    this.lastPlayed.set(id);
    this.feedback.set(fillNames(interaction.message, this.petName(), ''));
    this.played.emit(id);

    this.clearCooldown();
    this.cooldown = setTimeout(() => this.isBusy.set(false), COOLDOWN_IN_MS);
  }

  private clearCooldown(): void {
    if (this.cooldown !== null) {
      clearTimeout(this.cooldown);
      this.cooldown = null;
    }
  }
}
