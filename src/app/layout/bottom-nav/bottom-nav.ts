import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { PRIMARY_SECTIONS } from '../../core/data/site-sections.data';
import { NavSheet } from '../nav-sheet/nav-sheet';

/**
 * Barra de navegação do celular, fixa na base da tela.
 *
 * Substitui o menu retrátil no toque em vez de conviver com ele: para uma
 * criança de sete anos, um destino que está sempre visível vale mais do que um
 * destino escondido atrás de um ícone. Os quatro lugares mais usados ficam na
 * barra e o restante do site abre na folha "Mais".
 *
 * A partir do desktop a barra some e o cabeçalho volta a ser o menu.
 */
@Component({
  selector: 'app-bottom-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, NavSheet],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class BottomNav {
  protected readonly destinations = PRIMARY_SECTIONS;
  protected readonly isMenuOpen = signal(false);

  protected openMenu(): void {
    this.isMenuOpen.set(true);
  }
}
