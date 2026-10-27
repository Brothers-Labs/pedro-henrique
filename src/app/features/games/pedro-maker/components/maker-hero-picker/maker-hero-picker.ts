import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { paletteFor, type CharacterPalette } from '../../config/character.config';
import { HEROES, type HeroDefinition } from '../../config/hero.config';
import type { CharacterLook, HeroId } from '../../models/progress.model';
import { PedroFigure } from '../pedro-figure/pedro-figure';

interface HeroCard {
  readonly hero: HeroDefinition;
  readonly character: CharacterPalette;
}

/**
 * Cartões dos heróis jogáveis, cada um desenhado como entra na fase: o Pedro
 * com o visual escolhido e os outros com a roupa própria.
 *
 * Só mostra e avisa a escolha; quem usa decide o que fazer com ela — trocar o
 * herói em "Meu personagem" ou já começar a fase com ele.
 */
@Component({
  selector: 'app-maker-hero-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PedroFigure],
  templateUrl: './maker-hero-picker.html',
  styleUrl: './maker-hero-picker.scss',
})
export class MakerHeroPicker {
  readonly heading = input.required<string>();
  readonly selected = input.required<HeroId>();
  readonly look = input.required<CharacterLook>();
  /** Texto do selo no cartão do herói escolhido. */
  readonly badge = input('Jogando');

  readonly chose = output<HeroId>();

  protected readonly cards = computed<readonly HeroCard[]>(() => {
    const look = this.look();

    return HEROES.map((hero) => ({ hero, character: paletteFor(look, hero.id) }));
  });
}
