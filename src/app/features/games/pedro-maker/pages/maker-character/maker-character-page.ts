import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PetService } from '../../../../../core/services/pet.service';
import { MakerPageFrame } from '../../components/maker-page-frame/maker-page-frame';
import { PedroFigure } from '../../components/pedro-figure/pedro-figure';
import { LOOK_CATEGORIES, LOOK_OPTIONS, type LookCategory, type LookOption } from '../../config/character.config';
import type { CharacterLook } from '../../models/progress.model';
import { lookAvailability, type LookAvailability } from '../../progress/maker-progression';
import { MakerAudioService } from '../../services/maker-audio.service';
import { MakerProgressService } from '../../services/maker-progress.service';

interface OptionCard {
  readonly option: LookOption;
  readonly availability: LookAvailability;
}

/**
 * Meu personagem: boné, camiseta e mochila do Pedro.
 *
 * Tocar numa opção mostra como fica, sem compromisso; vestir ou comprar é um
 * segundo toque, no botão grande embaixo do Pedro. As moedas são do jogo e
 * nunca de dinheiro de verdade.
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

  protected readonly previewState = computed(() => {
    const option = this.preview();

    return option ? { option, availability: lookAvailability(this.progress.progress(), option) } : null;
  });

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
