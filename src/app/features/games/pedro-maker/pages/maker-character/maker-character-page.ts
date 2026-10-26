import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PetService } from '../../../../../core/services/pet.service';
import { MakerHeroPicker } from '../../components/maker-hero-picker/maker-hero-picker';
import { MakerPageFrame } from '../../components/maker-page-frame/maker-page-frame';
import { PedroFigure } from '../../components/pedro-figure/pedro-figure';
import { LOOK_CATEGORIES, LOOK_OPTIONS, paletteFor, type LookCategory, type LookOption } from '../../config/character.config';
import { heroDefinition } from '../../config/hero.config';
import type { CharacterLook, HeroId } from '../../models/progress.model';
import { lookAvailability, type LookAvailability } from '../../progress/maker-progression';
import { MakerAudioService } from '../../services/maker-audio.service';
import { MakerProgressService } from '../../services/maker-progress.service';

interface OptionCard {
  readonly option: LookOption;
  readonly availability: LookAvailability;
}

/**
 * Meu personagem: quem joga — o Pedro, o Gui, o Mario ou o Luigi — e o boné,
 * a camiseta e a mochila do Pedro.
 *
 * Trocar de herói é de graça e vale na hora. Tocar numa opção de visual
 * mostra como fica, sem compromisso; vestir ou comprar é um segundo toque, no
 * botão grande embaixo do Pedro. As moedas são do jogo e nunca de dinheiro de
 * verdade. Os outros heróis têm roupa própria, e por isso o guarda-roupa só
 * aparece para o Pedro.
 */
@Component({
  selector: 'app-maker-character-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MakerPageFrame, MakerHeroPicker, PedroFigure],
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
  protected readonly look = this.progress.look;
  protected readonly selectedHero = computed(() => heroDefinition(this.progress.hero()));
  protected readonly canCustomize = computed(() => this.selectedHero().outfit === null);

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
