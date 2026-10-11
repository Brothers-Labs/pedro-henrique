import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PetService } from '../../../../../core/services/pet.service';
import { MakerPageFrame } from '../../components/maker-page-frame/maker-page-frame';
import { PedroFigure } from '../../components/pedro-figure/pedro-figure';
import {
  LOOK_CATEGORIES,
  LOOK_OPTIONS,
  paletteFor,
  type CharacterPalette,
  type LookCategory,
  type LookOption,
} from '../../config/character.config';
import { heroDefinition, HEROES, type HeroDefinition } from '../../config/hero.config';
import type { CharacterLook, HeroId } from '../../models/progress.model';
import { lookAvailability, type LookAvailability } from '../../progress/maker-progression';
import { MakerAudioService } from '../../services/maker-audio.service';
import { MakerProgressService } from '../../services/maker-progress.service';

interface OptionCard {
  readonly option: LookOption;
  readonly availability: LookAvailability;
}

interface HeroCard {
  readonly hero: HeroDefinition;
  readonly character: CharacterPalette;
}

/**
 * Meu personagem: quem joga — o Pedro ou o Gui — e o boné, a camiseta e a
 * mochila do Pedro.
 *
 * Trocar de herói é de graça e vale na hora. Tocar numa opção de visual
 * mostra como fica, sem compromisso; vestir ou comprar é um segundo toque, no
 * botão grande embaixo do Pedro. As moedas são do jogo e nunca de dinheiro de
 * verdade. O Gui tem roupa própria, e por isso o guarda-roupa só aparece para
 * o Pedro.
 */
@Component({
  selector: 'app-maker-character-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MakerPageFrame, PedroFigure],
  templateUrl: './maker-character-page.html',
  styleUrl: './maker-character-page.scss',
})
export class MakerCharacterPage {
  private readonly progress = inject(MakerProgressService);
  private readonly audio = inject(MakerAudioService);
  private readonly pets = inject(PetService);

  protected readonly categories = LOOK_CATEGORIES;
  protected readonly category = signal<LookCategory>('cap');
  protected readonly preview = signal<LookOption | null>(null);
  protected readonly coins = this.progress.coins;
  protected readonly selectedHero = computed(() => heroDefinition(this.progress.hero()));
  protected readonly canCustomize = computed(() => this.selectedHero().outfit === null);

  /** Cada herói como vai entrar na fase: o Pedro com o visual atual, o Gui com o dele. */
  protected readonly heroCards = computed<readonly HeroCard[]>(() => {
    const look = this.progress.look();

    return HEROES.map((hero) => ({ hero, character: paletteFor(look, hero.id) }));
  });

  protected readonly pet = computed(() => {
    const pet = this.pets.pet();
    const type = this.pets.type();

    return pet && type ? { name: pet.name, emoji: type.emoji } : null;
  });

  protected readonly options = computed<readonly OptionCard[]>(() => {
    const progress = this.progress.progress();

    return LOOK_OPTIONS.filter((option) => option.category === this.category()).map((option) => ({
      option,
      availability: lookAvailability(progress, option),
    }));
  });

  /** Visual mostrado: o atual, com a opção em prova no lugar. */
  protected readonly previewLook = computed<CharacterLook>(() => {
    const look = this.progress.look();
    const option = this.preview();

    return option ? { ...look, [option.category]: option.id } : look;
  });

  protected readonly previewCharacter = computed(() => paletteFor(this.previewLook(), this.progress.hero()));

  protected readonly previewState = computed(() => {
    const option = this.preview();

    return option ? { option, availability: lookAvailability(this.progress.progress(), option) } : null;
  });

  protected chooseHero(hero: HeroId): void {
    if (this.progress.selectHero(hero)) {
      this.audio.play('powerup');
      this.preview.set(null);
    }
  }

  protected chooseCategory(category: LookCategory): void {
    this.category.set(category);
    this.preview.set(null);
  }

  protected tryOn(option: LookOption): void {
    this.preview.set(option);
    this.audio.play('button');
  }

  protected confirm(option: LookOption): void {
    if (this.progress.equip(option)) {
      this.audio.play('powerup');
      this.preview.set(null);
    }
  }
}
