import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CraftPageFrame } from '../../components/craft-page-frame/craft-page-frame';

/**
 * Tela de abertura do PedroCraft.
 *
 * Enquanto o mundo é construído, mostra o logo e avisa que o jogo está a
 * caminho.
 */
@Component({
  selector: 'app-craft-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CraftPageFrame],
  templateUrl: './craft-home-page.html',
  styleUrl: './craft-home-page.scss',
})
export class CraftHomePage {}
