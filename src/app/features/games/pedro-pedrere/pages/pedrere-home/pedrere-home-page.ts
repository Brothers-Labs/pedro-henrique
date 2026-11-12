import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PedrereHeroPreview } from '../../components/pedrere-hero-preview/pedrere-hero-preview';
import { PedrerePageFrame } from '../../components/pedrere-page-frame/pedrere-page-frame';
import { ADVENTURE_LEVELS } from '../../levels/adventure-levels';
import { PedrereProgressService } from '../../services/pedrere-progress.service';

interface MenuEntry {
  readonly label: string;
  readonly emoji: string;
  readonly route: string;
  readonly tone: 'green' | 'pink' | 'orange' | 'blue' | 'purple';
}

/** Aventuras vem primeiro e maior: é a porta para quem chega pela primeira vez. */
const MENU: readonly MenuEntry[] = [
  { label: 'Aventuras', emoji: '🗺️', route: 'aventuras', tone: 'green' },
  { label: 'Pula-pula', emoji: '🤸', route: 'pula-pula', tone: 'pink' },
  { label: 'Corrida', emoji: '🏁', route: 'corrida', tone: 'orange' },
  { label: 'Personagem', emoji: '👕', route: 'personagem', tone: 'blue' },
  { label: 'Modo maker', emoji: '🛠️', route: 'maker', tone: 'purple' },
];

/** Tela inicial do Pedro Pedrerê: os cinco modos e o Pedro com a roupa escolhida. */
@Component({
  selector: 'app-pedrere-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PedrerePageFrame, PedrereHeroPreview],
  templateUrl: './pedrere-home-page.html',
  styleUrl: './pedrere-home-page.scss',
})
export class PedrereHomePage {
  private readonly pedrereProgress = inject(PedrereProgressService);

  protected readonly menu = MENU;
  protected readonly maxStars = ADVENTURE_LEVELS.length * 3;
  protected readonly look = this.pedrereProgress.look;
  protected readonly progress = this.pedrereProgress.progress;
  protected readonly totalStars = this.pedrereProgress.totalStars;
}
