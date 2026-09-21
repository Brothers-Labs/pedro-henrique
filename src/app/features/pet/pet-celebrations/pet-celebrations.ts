import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import type { PetCelebration } from '../../../core/models/pet.model';
import { MotionPreferenceService } from '../../../core/services/motion-preference.service';
import { PetService } from '../../../core/services/pet.service';
import { SoundService } from '../../../core/services/sound.service';
import { CelebrationEffects } from '../../../shared/components/celebration-effects/celebration-effects';
import { PetAvatar } from '../pet-avatar/pet-avatar';

/** Tempo que o aviso de nível ou conquista fica na tela. */
const TOAST_DURATION_IN_MS = 4200;

/** Suspense antes de revelar a nova forma. Curto: criança não espera muito. */
const SUSPENSE_IN_MS = 1800;

/**
 * Comemorações do mascote.
 *
 * É o único consumidor da fila do serviço, e mostra uma de cada vez: nível e
 * conquista viram um aviso que some sozinho; evolução abre o modal grande.
 * Como a fila é uma só, nunca existem dois avisos disputando a mesma tela.
 *
 * O modal espera qualquer outro diálogo fechar antes de abrir — é o que impede
 * a evolução de cair por cima da comemoração de fim de nível do jogo.
 */
@Component({
  selector: 'app-pet-celebrations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PetAvatar, CelebrationEffects],
  templateUrl: './pet-celebrations.html',
  styleUrl: './pet-celebrations.scss',
})
export class PetCelebrations {
  private readonly petService = inject(PetService);
  private readonly sound = inject(SoundService);
  private readonly motion = inject(MotionPreferenceService);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  private toastTimeout: ReturnType<typeof setTimeout> | null = null;
  private revealTimeout: ReturnType<typeof setTimeout> | null = null;
  /** Cancela a espera por outro diálogo se a comemoração perder a vez. */
  private waiting: AbortController | null = null;

  protected readonly phase = signal<'suspense' | 'revelacao'>('suspense');

  private readonly pending = computed(() => this.petService.pendingCelebration());

  protected readonly petName = computed(() => this.petService.pet()?.name ?? '');
  protected readonly type = computed(() => this.petService.pet()?.type ?? 'dragao');
  protected readonly accessoryId = computed(
    () => this.petService.pet()?.equippedAccessory ?? null,
  );

  /** Comemoração em forma de aviso; `null` quando a da vez é uma evolução. */
  protected readonly toast = computed<PetCelebration | null>(() => {
    const current = this.pending();

    return current && current.kind !== 'evolucao' ? current : null;
  });

  /** Estado do modal: só assume valor depois que a vez dele chega. */
  protected readonly evolution = signal<
    Extract<PetCelebration, { kind: 'evolucao' }> | null
  >(null);

  constructor() {
    effect(() => {
      const current = this.pending();

      untracked(() => this.present(current));
    });

    effect(() => {
      const shouldOpen = this.evolution() !== null;
      const element = this.dialog().nativeElement;

      if (shouldOpen && !element.open) {
        element.showModal();
        return;
      }

      if (!shouldOpen && element.open) {
        element.close();
      }
    });

    inject(DestroyRef).onDestroy(() => this.clearTimers());
  }

  protected dismiss(): void {
    this.clearTimers();
    this.evolution.set(null);
    this.petService.dismissCelebration();
  }

  private present(celebration: PetCelebration | null): void {
    this.clearTimers();

    if (!celebration) {
      this.evolution.set(null);
      return;
    }

    if (celebration.kind === 'evolucao') {
      this.openEvolution(celebration);
      return;
    }

    this.evolution.set(null);
    this.sound.play(celebration.kind === 'nivel' ? 'nivel' : 'conquista');
    this.toastTimeout = setTimeout(() => this.dismiss(), TOAST_DURATION_IN_MS);
  }

  private openEvolution(celebration: Extract<PetCelebration, { kind: 'evolucao' }>): void {
    const other = this.openDialogElsewhere();

    if (other) {
      // A vez é dela, mas a tela está ocupada: espera o outro diálogo fechar.
      this.waiting = new AbortController();
      other.addEventListener('close', () => this.openEvolution(celebration), {
        once: true,
        signal: this.waiting.signal,
      });

      return;
    }

    this.sound.play('evolucao');

    if (!this.motion.isAllowed()) {
      // Sem movimento não há suspense a construir: revela direto.
      this.phase.set('revelacao');
      this.evolution.set(celebration);

      return;
    }

    this.phase.set('suspense');
    this.evolution.set(celebration);
    this.revealTimeout = setTimeout(() => this.phase.set('revelacao'), SUSPENSE_IN_MS);
  }

  /** Outro `<dialog>` aberto na página, que não seja o nosso. */
  private openDialogElsewhere(): HTMLDialogElement | null {
    const own = this.dialog().nativeElement;

    return (
      Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).find(
        (element) => element !== own,
      ) ?? null
    );
  }

  private clearTimers(): void {
    if (this.toastTimeout !== null) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }

    if (this.revealTimeout !== null) {
      clearTimeout(this.revealTimeout);
      this.revealTimeout = null;
    }

    this.waiting?.abort();
    this.waiting = null;
  }
}
