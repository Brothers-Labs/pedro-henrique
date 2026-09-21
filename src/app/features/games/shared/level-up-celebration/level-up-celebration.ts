import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { PROFILE } from '../../../../core/data/profile.data';
import { MotionPreferenceService } from '../../../../core/services/motion-preference.service';
import { CelebrationEffects } from '../../../../shared/components/celebration-effects/celebration-effects';

/**
 * Espera antes de abrir, para a barra de progresso terminar de encher.
 *
 * Fica aqui, e não em cada jogo, para que a sequência "barra fecha, modal
 * abre" seja exatamente a mesma nos sete.
 */
const OPEN_DELAY_IN_MS = 780;

/** Tudo o que a comemoração precisa saber, montado por quem a abre. */
export interface CelebrationData {
  /** Nome do jogo, para a criança saber de onde veio a conquista. */
  readonly gameLabel: string;
  readonly level: number;
  readonly stars: number;
  readonly earnedPoints: number;
  readonly streak: number;
  readonly isPerfect: boolean;
  readonly message: string;
}

/**
 * Comemoração de fim de nível, compartilhada por todos os jogos.
 *
 * É um `<dialog>` nativo: prisão de foco, `Esc` e devolução do foco ao botão de
 * origem vêm prontos do navegador. Os confetes moram dentro dele porque a
 * camada superior do navegador cobre qualquer `z-index` da página — do lado de
 * fora, eles ficariam escondidos atrás do próprio modal.
 */
@Component({
  selector: 'app-level-up-celebration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CelebrationEffects],
  templateUrl: './level-up-celebration.html',
  styleUrl: './level-up-celebration.scss',
})
export class LevelUpCelebration {
  /** Dados da comemoração; `null` mantém o modal fechado. */
  readonly data = input<CelebrationData | null>(null);

  readonly continued = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly motion = inject(MotionPreferenceService);
  private openTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Cópia local: o modal só passa a existir quando a espera termina. */
  protected readonly visible = signal<CelebrationData | null>(null);

  protected readonly childName = PROFILE.firstName;
  protected readonly isMotionAllowed = computed(() => this.motion.isAllowed());

  /** No modo calmo o brilho substitui a festa: reconhece sem estimular. */
  protected readonly headlineEmoji = computed(() => (this.isMotionAllowed() ? '🎉' : '✨'));

  protected readonly starSlots = computed(() => {
    const earned = this.visible()?.stars ?? 0;

    return [1, 2, 3].map((position) => position <= earned);
  });

  constructor() {
    effect(() => {
      const incoming = this.data();

      untracked(() => {
        this.clearTimer();

        if (!incoming) {
          this.visible.set(null);
          return;
        }

        this.openTimeout = setTimeout(() => this.visible.set(incoming), OPEN_DELAY_IN_MS);
      });
    });

    effect(() => {
      const isOpen = this.visible() !== null;
      const element = this.dialog().nativeElement;

      if (isOpen && !element.open) {
        element.showModal();
        return;
      }

      if (!isOpen && element.open) {
        element.close();
      }
    });

    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  private clearTimer(): void {
    if (this.openTimeout !== null) {
      clearTimeout(this.openTimeout);
      this.openTimeout = null;
    }
  }

  protected close(): void {
    this.continued.emit();
  }
}
