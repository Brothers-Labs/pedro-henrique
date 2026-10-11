import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { MAX_CAMPAIGN_STARS } from '../../progress/maker-progression';
import { MakerProgressService } from '../../services/maker-progress.service';
import { PedroFigure } from '../pedro-figure/pedro-figure';

const NUMBER_FORMAT = new Intl.NumberFormat('pt-BR');

/**
 * Barra de status do aventureiro: nível, XP, moedas, cristais e estrelas.
 *
 * Aparece no topo das telas do jogo para a criança ver a própria evolução
 * sem precisar abrir nada.
 */
@Component({
  selector: 'app-maker-status-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PedroFigure],
  templateUrl: './maker-status-bar.html',
  styleUrl: './maker-status-bar.scss',
})
export class MakerStatusBar {
  private readonly progress = inject(MakerProgressService);

  protected readonly character = this.progress.character;
  protected readonly adventurer = this.progress.adventurer;
  protected readonly coins = computed(() => NUMBER_FORMAT.format(this.progress.coins()));
  protected readonly crystals = this.progress.crystals;
  protected readonly stars = this.progress.stars;
  protected readonly maxStars = MAX_CAMPAIGN_STARS;
}
