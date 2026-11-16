import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ChoiceChips } from '../../components/choice-chips/choice-chips';
import { ScenePlayer } from '../../components/scene-player/scene-player';
import { EMOJI_CHIPS, FRAME_CHIPS, OVERLAY_CHIPS, STICKER_CHIPS } from '../../data/tube-choices.data';
import { FILTER_KEYS, FILTER_LIMITS, NEUTRAL_FILTER } from '../../data/tube-effects.data';
import { MAX_EFFECT_NAME_LENGTH } from '../../engine/tube-storage';
import type { TubeEffect, TubeFilter, TubeFrame, TubeOverlay, TubeScene } from '../../models/tube.model';
import { PedroTubeStore } from '../../services/pedro-tube-store.service';

/** Cenas de amostra que tocam na prévia, para ver o efeito em cores variadas. */
const SAMPLE_SCENES: readonly TubeScene[] = [
  { emoji: '👷', text: 'Meu efeito!', background: '#2ba8e0', motion: 'pular', seconds: 2 },
  { emoji: '🦖', text: 'Ficou demais!', background: '#12b886', motion: 'tremer', seconds: 2 },
  { emoji: '🍕', text: 'Olha as cores!', background: '#ffb703', motion: 'girar', seconds: 2 },
];

/**
 * Criador de efeitos: controles deslizantes de cor, partículas, moldura e
 * figurinha, com uma prévia que toca enquanto a criança mexe.
 */
@Component({
  selector: 'app-effect-creator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ChoiceChips, ScenePlayer],
  templateUrl: './effect-creator.html',
  styleUrl: '../studio-form.scss',
})
export class EffectCreator {
  protected readonly store = inject(PedroTubeStore);

  protected readonly sampleScenes = SAMPLE_SCENES;
  protected readonly emojiChips = EMOJI_CHIPS;
  protected readonly overlayChips = OVERLAY_CHIPS;
  protected readonly frameChips = FRAME_CHIPS;
  protected readonly stickerChips = STICKER_CHIPS;
  protected readonly filterKeys = FILTER_KEYS;
  protected readonly limits = FILTER_LIMITS;
  protected readonly maxNameLength = MAX_EFFECT_NAME_LENGTH;

  protected readonly name = signal('');
  protected readonly emoji = signal('🔥');
  protected readonly filter = signal<TubeFilter>(NEUTRAL_FILTER);
  protected readonly overlay = signal<string>('estrelas');
  protected readonly frame = signal<string>('neon');
  protected readonly sticker = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly feedback = signal<string | null>(null);

  /** O efeito do jeito que está agora, tocando na prévia. */
  protected readonly draft = computed<TubeEffect>(() => ({
    id: 'rascunho',
    name: this.name().trim() || 'Meu efeito',
    emoji: this.emoji(),
    filter: this.filter(),
    overlay: this.overlay() as TubeOverlay,
    frame: this.frame() as TubeFrame,
    sticker: this.sticker(),
  }));

  protected setFilter(key: keyof TubeFilter, value: string): void {
    const number = Number(value);

    if (Number.isFinite(number)) {
      this.filter.update((filter) => ({ ...filter, [key]: number }));
    }
  }

  protected resetFilter(): void {
    this.filter.set(NEUTRAL_FILTER);
  }

  protected save(): void {
    if (!this.name().trim()) {
      this.error.set('Dê um nome para o efeito.');
      return;
    }

    const { emoji, filter, overlay, frame, sticker } = this.draft();
    const effect = this.store.createEffect({ name: this.name(), emoji, filter, overlay, frame, sticker });

    if (!effect) {
      this.error.set(this.store.saveError() ?? 'Você já tem efeitos demais. Apague um para criar outro.');
      return;
    }

    this.error.set(null);
    this.feedback.set(`Efeito ${effect.name} salvo! Ele já aparece na lista de efeitos dos vídeos.`);
    this.name.set('');
  }

  protected remove(effect: TubeEffect): void {
    if (this.store.deleteEffect(effect.id)) {
      this.feedback.set(`Efeito ${effect.name} apagado.`);
    }
  }
}
