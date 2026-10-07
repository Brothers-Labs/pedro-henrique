import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { PRIMARY_SECTIONS } from '../../core/data/site-sections.data';
import { SideNavService } from '../../core/services/side-nav.service';
import { SIDE_NAV_ID } from '../side-nav/side-nav';

/**
 * Barra de navegação do celular, fixa na base da tela.
 *
 * Convive com o menu lateral de propósito: para uma criança de sete anos, um
 * destino que está sempre visível vale mais do que um destino escondido atrás
 * de um ícone. Os quatro lugares mais usados ficam na barra, e o botão "Mais"
 * abre o menu lateral com o site inteiro.
 *
 * A partir do desktop a barra some e o menu lateral fica fixo na tela.
 */
@Component({
  selector: 'app-bottom-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class BottomNav {
  protected readonly destinations = PRIMARY_SECTIONS;
  protected readonly sideNav = inject(SideNavService);
  protected readonly sideNavId = SIDE_NAV_ID;
}
