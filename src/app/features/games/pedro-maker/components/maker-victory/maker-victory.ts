import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';

import { CelebrationEffects } from '../../../../../shared/components/celebration-effects/celebration-effects';
import type { LevelReward, LevelRunResult } from '../../models/progress.model';
import { MakerProgressService } from '../../services/maker-progress.service';

export interface VictoryAction {
  readonly id: string;
  readonly label: string;
  readonly emoji: string;
  readonly tone: 'green' | 'blue' | 'orange' | 'purple';
}

/**
 * Comemoração do fim da fase.
 *
 * Mostra o que a criança fez — tempo, moedas, cristais, inimigos — e o que
 * ganhou, com a barra de XP enchendo na frente dela. Os botões vêm de quem
 * abre a tela: na campanha é "próxima fase", no editor é "voltar ao editor".
 */
@Component({
  selector: 'app-maker-victory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CelebrationEffects],
  templateUrl: './maker-victory.html',
  styleUrl: './maker-victory.scss',
})
export class MakerVictory {
  readonly result = input.required<LevelRunResult>();
  readonly reward = input.required<LevelReward>();
  readonly actions = input.required<readonly VictoryAction[]>();

  readonly chose = output<string>();

  private readonly progress = inject(MakerProgressService);
  private readonly actionButtons = viewChildren<ElementRef<HTMLButtonElement>>('actionButton');

  protected readonly adventurer = this.progress.adventurer;

  /** A barra começa vazia e enche no quadro seguinte, para a criança ver o XP entrar. */
  protected readonly isBarFilled = signal(false);

  protected readonly title = computed(() => (this.reward().worldCompleted ? 'MUNDO COMPLETO!' : 'FASE CONCLUÍDA!'));

  protected readonly time = computed(() => formatTime(this.result().timeMs));

  protected readonly stars = computed(() => [1, 2, 3].map((position) => position <= this.reward().stars));

  protected readonly crystals = computed(() => this.result().crystalsFound);

  protected readonly foundCrystals = computed(() => this.crystals().filter((isFound) => isFound).length);

  constructor() {
    afterNextRender(() => {
      this.actionButtons()[0]?.nativeElement.focus();
      requestAnimationFrame(() => this.isBarFilled.set(true));
    });
  }
}

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
