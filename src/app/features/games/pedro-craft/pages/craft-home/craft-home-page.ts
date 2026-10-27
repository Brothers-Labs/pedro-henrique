import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CraftPageFrame } from '../../components/craft-page-frame/craft-page-frame';

/**
 * Tela de abertura do PedroCraft.
 *
 * Mostra o logo e leva direto à fazenda: um toque e a criança já está no
 * mundo.
 */
@Component({
  selector: 'app-craft-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CraftPageFrame],
  templateUrl: './craft-home-page.html',
  styleUrl: './craft-home-page.scss',
})
export class CraftHomePage {}
