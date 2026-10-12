import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PedroFigure } from '../../../pedro-maker/components/pedro-figure/pedro-figure';
import { MakerProgressService } from '../../../pedro-maker/services/maker-progress.service';
import { KartPageFrame } from '../../components/kart-page-frame/kart-page-frame';
import { kartBody, kartColor } from '../../config/kart.config';
import { KartProgressService } from '../../services/kart-progress.service';

interface MenuEntry {
  readonly label: string;
  readonly emoji: string;
  readonly route: string;
  readonly tone: 'orange' | 'blue' | 'green';
}

/** Correr vem primeiro e maior: é o que a criança quer fazer assim que entra. */
const MENU: readonly MenuEntry[] = [
  { label: 'Correr', emoji: '🏁', route: 'pistas', tone: 'orange' },
  { label: 'Garagem', emoji: '🎨', route: 'garagem', tone: 'blue' },
  { label: 'Pedro Kart Maker', emoji: '🛠️', route: 'criar', tone: 'green' },
];

/**
 * Tela inicial do Pedro Kart.
 *
 * O piloto é o Pedro do Pedro Maker, com a roupa que ele escolheu lá; o kart
 * que aparece embaixo dele é o da garagem.
 */
@Component({
  selector: 'app-kart-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, KartPageFrame, PedroFigure],
  templateUrl: './kart-home-page.html',
  styleUrl: './kart-home-page.scss',
})
export class KartHomePage {
  private readonly kartProgress = inject(KartProgressService);

  protected readonly menu = MENU;
  protected readonly character = inject(MakerProgressService).character;
  protected readonly progress = this.kartProgress.progress;

  protected readonly kart = computed(() => {
    const setup = this.kartProgress.setup();

    return { body: kartBody(setup.body), color: kartColor(setup.color) };
  });
}
