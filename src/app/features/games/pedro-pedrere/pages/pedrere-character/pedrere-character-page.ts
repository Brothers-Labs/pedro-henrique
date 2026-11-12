import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PedrereHeroPreview } from '../../components/pedrere-hero-preview/pedrere-hero-preview';
import { PedrerePageFrame } from '../../components/pedrere-page-frame/pedrere-page-frame';
import { HATS, PANTS_COLORS, SHIRT_COLORS } from '../../config/hero-look.config';
import { PedrereProgressService } from '../../services/pedrere-progress.service';

/**
 * Personagem: a criança escolhe a roupa e o chapéu do Pedro.
 *
 * Cada toque já salva e já aparece na prévia — não existe botão de "salvar"
 * para esquecer de apertar.
 */
@Component({
  selector: 'app-pedrere-character-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PedrerePageFrame, PedrereHeroPreview],
  templateUrl: './pedrere-character-page.html',
  styleUrl: './pedrere-character-page.scss',
})
export class PedrereCharacterPage {
  protected readonly progress = inject(PedrereProgressService);
  protected readonly look = this.progress.look;
  protected readonly shirts = SHIRT_COLORS;
  protected readonly pants = PANTS_COLORS;
  protected readonly hats = HATS;
}
