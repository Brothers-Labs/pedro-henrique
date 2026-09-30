import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';

import { PROFILE } from '../../../core/data/profile.data';
import {
  fillNames,
  PET_CORRECT_MESSAGES,
  PET_STREAK_MESSAGES,
  PET_WRONG_MESSAGES,
} from '../../../core/data/pet.data';
import { GameEventBus } from '../../../core/events/game-event-bus';
import type { GameEvent } from '../../../core/models/game-event.model';
import { PetService } from '../../../core/services/pet.service';
import { pickRandom } from '../../../core/utils/shuffle';
import { PetAvatar } from '../pet-avatar/pet-avatar';

/** Tempo que a fala fica na tela. */
const VISIBLE_IN_MS = 3800;

/**
 * Silêncio mínimo entre duas falas.
 *
 * Um mascote que comenta cada toque cansa em dois minutos e vira ruído. Ele
 * fala pouco de propósito: assim, quando fala, a criança olha.
 */
const QUIET_IN_MS = 14000;

/** A partir daqui a sequência merece comentário, mesmo dentro do silêncio. */
const STREAK_MILESTONE = 5;

/**
 * O mascote acompanhando os jogos.
 *
 * Escuta os eventos da jornada — não o jogo — e por isso funciona igual nos
 * sete sem que nenhum deles saiba que ele existe.
 *
 * Cala quando há comemoração maior na tela: dois avisos ao mesmo tempo viram
 * confusão, e a festa de nível é mais importante do que o comentário.
 */
@Component({
  selector: 'app-pet-companion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PetAvatar],
  template: `
    @if (visibleMessage(); as speech) {
      @let current = pet();

      @if (current) {
        <aside class="companion" [attr.data-color]="color()" aria-live="polite">
          <app-pet-avatar
            [type]="current.type"
            [stage]="stage()"
            [accessoryId]="current.equippedAccessory"
            [mood]="mood()"
            size="pequeno"
            [label]="current.name"
          />

          <p class="companion__bubble">{{ speech }}</p>
        </aside>
      }
    }
  `,
  styleUrl: './pet-companion.scss',
})
export class PetCompanion {
  private readonly petService = inject(PetService);

  private readonly message = signal('');
  private lastSpokeAt = 0;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly pet = computed(() => this.petService.pet());
  protected readonly stage = computed(() => this.petService.stage()?.id ?? 'bebe');
  protected readonly color = computed(() => this.petService.type()?.color ?? 'purple');

  protected readonly mood = signal<'parado' | 'feliz' | 'comemorando'>('feliz');

  /** Falas próprias do tipo escolhido: é delas que vem a personalidade. */
  private readonly voice = computed(() => this.petService.type()?.voice ?? null);

  /** A fala some sozinha quando uma comemoração maior toma a tela. */
  protected readonly visibleMessage = computed(() =>
    this.petService.pendingCelebration() ? '' : this.message(),
  );

  constructor() {
    const subscription = inject(GameEventBus).events.subscribe((event) => this.react(event));

    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      this.clearTimer();
    });
  }

  private react(event: GameEvent): void {
    if (!this.petService.hasPet()) {
      return;
    }

    if (event.type === 'LEVEL_COMPLETED') {
      const gained = this.petService.lastXpGain()?.amount ?? 0;

      this.say(`Conseguimos! +${gained} XP ⭐`, 'comemorando', true);
      return;
    }

    if (event.type !== 'CHALLENGE_COMPLETED') {
      return;
    }

    const isMilestone =
      event.wasCorrect && event.streak >= STREAK_MILESTONE && event.streak % STREAK_MILESTONE === 0;

    const voice = this.voice();

    if (isMilestone) {
      this.say(this.draw(PET_STREAK_MESSAGES, voice?.cheer), 'comemorando', true);
      return;
    }

    this.say(
      event.wasCorrect
        ? this.draw(PET_CORRECT_MESSAGES, voice?.cheer)
        : this.draw(PET_WRONG_MESSAGES, voice?.comfort),
      event.wasCorrect ? 'feliz' : 'parado',
      false,
    );
  }

  /** Fala, respeitando o silêncio — salvo nos momentos que valem a interrupção. */
  private say(text: string, mood: 'parado' | 'feliz' | 'comemorando', isImportant: boolean): void {
    const now = Date.now();

    if (!isImportant && now - this.lastSpokeAt < QUIET_IN_MS) {
      return;
    }

    this.lastSpokeAt = now;
    this.mood.set(mood);
    this.message.set(text);

    this.clearTimer();
    this.hideTimeout = setTimeout(() => this.message.set(''), VISIBLE_IN_MS);
  }

  /**
   * Sorteia uma fala do repertório comum somada à fala própria do tipo.
   *
   * É o que faz o robô comemorar como robô e o cachorro como cachorro, sem
   * escrever quatro repertórios inteiros nem um `if` por tipo.
   */
  private draw(pool: readonly string[], ownLine: string | undefined): string {
    const template = pickRandom(ownLine ? [...pool, ownLine] : pool) ?? '';
    const name = this.petService.pet()?.name ?? '';

    return fillNames(template, name, PROFILE.firstName);
  }

  private clearTimer(): void {
    if (this.hideTimeout !== null) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }
}
