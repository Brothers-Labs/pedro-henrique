import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, output, signal } from '@angular/core';

import {
  SPRUNK_ACCESSORIES,
  SPRUNK_ACCESSORY_LABELS,
  SPRUNK_BODY_COLORS,
  SPRUNK_CUSTOM_ACTION_LABELS,
  SPRUNK_CUSTOM_ACTIONS,
  SPRUNK_EYES,
  SPRUNK_EYES_LABELS,
} from '../../data/sprunk-parts.data';
import { SPRUNK_CATEGORY_LABELS, SPRUNK_SOUNDS, sprunkSound } from '../../data/sprunk-sounds.data';
import type { SprunkCharacter, SprunkDraft } from '../../models/sprunk.model';
import {
  isValidDraft,
  MAX_CUSTOM_SPRUNKS,
  MAX_SPRUNK_NAME_LENGTH,
  MySprunksService,
} from '../../services/my-sprunks.service';
import { SprunkAudioService } from '../../services/sprunk-audio.service';
import { SprunkFigure } from '../sprunk-figure/sprunk-figure';

const INITIAL_DRAFT: SprunkDraft = {
  name: '',
  color: SPRUNK_BODY_COLORS[0],
  accessory: 'none',
  eyes: 'round',
  action: 'jump',
  soundId: SPRUNK_SOUNDS[0].id,
};

/** Quanto tempo a prévia mostra a ação depois de um toque em "Ouvir". */
const PREVIEW_ACTION_MS = 700;

/**
 * "Meus personagens": o Pedro monta um boneco peça por peça e ele entra na
 * paleta da banda.
 *
 * A prévia mostra o boneco do jeito que vai ficar e "Ouvir" toca o som
 * escolhido com a ação dele — antes de criar, o Pedro já sabe o que fez.
 */
@Component({
  selector: 'app-sprunk-creator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SprunkFigure],
  templateUrl: './sprunk-creator.html',
  styleUrl: './sprunk-creator.scss',
})
export class SprunkCreator {
  private readonly mySprunks = inject(MySprunksService);
  private readonly audio = inject(SprunkAudioService);
  private previewTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly created = output<SprunkCharacter>();

  protected readonly colors = SPRUNK_BODY_COLORS;
  protected readonly accessories = SPRUNK_ACCESSORIES;
  protected readonly accessoryLabels = SPRUNK_ACCESSORY_LABELS;
  protected readonly eyesOptions = SPRUNK_EYES;
  protected readonly eyesLabels = SPRUNK_EYES_LABELS;
  protected readonly actions = SPRUNK_CUSTOM_ACTIONS;
  protected readonly actionLabels = SPRUNK_CUSTOM_ACTION_LABELS;
  protected readonly sounds = SPRUNK_SOUNDS;
  protected readonly categoryLabels = SPRUNK_CATEGORY_LABELS;
  protected readonly maxNameLength = MAX_SPRUNK_NAME_LENGTH;
  protected readonly maxCharacters = MAX_CUSTOM_SPRUNKS;

  protected readonly draft = signal<SprunkDraft>(INITIAL_DRAFT);
  protected readonly isPreviewActing = signal(false);
  protected readonly myCharacters = this.mySprunks.characters;

  protected readonly preview = computed<SprunkCharacter>(() => ({
    ...this.draft(),
    id: 'previa',
    name: this.draft().name || 'Meu boneco',
    shape: 'classic',
    isCustom: true,
  }));
  protected readonly canCreate = computed(
    () => isValidDraft(this.draft()) && this.myCharacters().length < MAX_CUSTOM_SPRUNKS,
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearPreviewTimeout());
  }

  protected update<Key extends keyof SprunkDraft>(key: Key, value: SprunkDraft[Key]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  protected updateName(event: Event): void {
    this.update('name', (event.target as HTMLInputElement).value);
  }

  protected updateSound(event: Event): void {
    this.update('soundId', (event.target as HTMLSelectElement).value);
  }

  protected listen(): void {
    this.audio.playPhrase(sprunkSound(this.draft().soundId));
    this.clearPreviewTimeout();
    this.isPreviewActing.set(true);
    this.previewTimeout = setTimeout(() => this.isPreviewActing.set(false), PREVIEW_ACTION_MS);
  }

  protected create(): void {
    const character = this.mySprunks.create(this.draft());

    if (!character) {
      return;
    }

    this.draft.set({ ...INITIAL_DRAFT, color: this.draft().color });
    this.created.emit(character);
  }

  protected remove(character: SprunkCharacter): void {
    this.mySprunks.remove(character.id);
  }

  private clearPreviewTimeout(): void {
    if (this.previewTimeout !== null) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }
  }
}
