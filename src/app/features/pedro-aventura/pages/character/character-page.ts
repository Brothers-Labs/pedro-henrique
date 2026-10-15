import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LobbyStage } from '../../components/lobby-stage';
import { COSMETIC_SLOTS, COSMETICS, cosmeticById, RARITY_LABEL } from '../../config/cosmetics.config';
import type { LobbyLook } from '../../engine/lobby-scene';
import type { Cosmetic, CosmeticSlot } from '../../models/economy.model';
import { AventuraAudio } from '../../services/aventura-audio.service';
import { AventuraStore } from '../../services/aventura-store.service';

/**
 * Personagem: roupa do Pedro, visual do Rex e o veículo do lobby.
 *
 * Tocar num item mostra na hora como fica no palco 3D; "Usar" equipa. Itens
 * que a criança ainda não tem aparecem com o caminho para ganhá-los.
 */
@Component({
  selector: 'app-character-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LobbyStage],
  templateUrl: './character-page.html',
  styleUrls: ['../page.scss', './character-page.scss'],
})
export class CharacterPage {
  private readonly store = inject(AventuraStore);
  private readonly audio = inject(AventuraAudio);

  protected readonly slots = COSMETIC_SLOTS;
  protected readonly rarityLabel = RARITY_LABEL;
  protected readonly slot = signal<CosmeticSlot>('outfit');
  protected readonly preview = signal<Cosmetic | null>(null);

  protected readonly items = computed(() => {
    const { owned, equipped } = this.store.inventory();

    return COSMETICS.filter((cosmetic) => cosmetic.slot === this.slot()).map((cosmetic) => ({
      cosmetic,
      isOwned: owned.includes(cosmetic.id),
      isEquipped: equipped[cosmetic.slot] === cosmetic.id,
    }));
  });

  protected readonly previewLook = computed<LobbyLook>(() => {
    const equipped = this.store.equipped();
    const preview = this.preview();

    return preview ? { ...equipped, [preview.slot]: preview } : equipped;
  });

  protected readonly selected = computed(() => {
    const preview = this.preview();

    return preview ?? cosmeticById(this.store.inventory().equipped[this.slot()]);
  });

  protected chooseSlot(slot: CosmeticSlot): void {
    this.slot.set(slot);
    this.preview.set(null);
  }

  protected tryOn(cosmetic: Cosmetic): void {
    this.preview.set(cosmetic);
    this.audio.play('button');
  }

  protected equip(cosmetic: Cosmetic): void {
    if (this.store.equip(cosmetic.id)) {
      this.preview.set(null);
      this.audio.play('claim');
    }
  }

  protected owns(cosmetic: Cosmetic): boolean {
    return this.store.owns(cosmetic.id);
  }

  protected isEquipped(cosmetic: Cosmetic): boolean {
    return this.store.inventory().equipped[cosmetic.slot] === cosmetic.id;
  }
}
