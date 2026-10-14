import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PedroFigure } from '../../../pedro-maker/components/pedro-figure/pedro-figure';
import { MakerProgressService } from '../../../pedro-maker/services/maker-progress.service';
import { FlashPageFrame } from '../../components/flash-page-frame/flash-page-frame';
import { shoe, trailColor } from '../../config/runner.config';
import { FlashProgressService } from '../../services/flash-progress.service';

interface MenuEntry {
  readonly label: string;
  readonly emoji: string;
  readonly route: string;
  readonly query: Readonly<Record<string, string>> | null;
  readonly tone: 'yellow' | 'orange' | 'purple' | 'blue' | 'green';
}

/** Aventura vem primeiro e maior: é o que a criança quer fazer assim que entra. */
const MENU: readonly MenuEntry[] = [
  { label: 'Aventura', emoji: '⚡', route: 'fases', query: null, tone: 'yellow' },
  { label: 'Corrida', emoji: '🏁', route: 'fases', query: { modo: 'corrida' }, tone: 'orange' },
  { label: 'Batalha', emoji: '🤖', route: 'batalha', query: null, tone: 'purple' },
  { label: 'Vestiário', emoji: '👟', route: 'vestiario', query: null, tone: 'blue' },
  { label: 'Pedro Flash Maker', emoji: '🛠️', route: 'criar', query: null, tone: 'green' },
];

/**
 * Tela inicial do Pedro Flash.
 *
 * O corredor é o Pedro do Pedro Maker, com a roupa que ele escolheu lá; o
 * tênis e o rastro de raio são os do vestiário.
 */
@Component({
  selector: 'app-flash-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FlashPageFrame, PedroFigure],
  templateUrl: './flash-home-page.html',
  styleUrl: './flash-home-page.scss',
})
export class FlashHomePage {
  private readonly flashProgress = inject(FlashProgressService);

  protected readonly menu = MENU;
  protected readonly character = inject(MakerProgressService).character;
  protected readonly progress = this.flashProgress.progress;

  protected readonly look = computed(() => {
    const setup = this.flashProgress.setup();

    return { shoe: shoe(setup.shoe), trail: trailColor(setup.trail) };
  });
}
