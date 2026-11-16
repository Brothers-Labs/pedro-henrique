import { ChangeDetectionStrategy, Component, model } from '@angular/core';

import { ChoiceChips } from '../../components/choice-chips/choice-chips';
import { COLOR_CHIPS } from '../../data/tube-choices.data';
import { EMOJI_CHOICES, MOTION_OPTIONS } from '../../data/tube-effects.data';
import { MAX_SCENE_SECONDS, MAX_SCENE_TEXT_LENGTH, MAX_SCENES, MIN_SCENE_SECONDS } from '../../engine/scene-timeline';
import type { TubeMotion, TubeScene } from '../../models/tube.model';

/** Cena nova: pega a próxima cor da lista, para as cenas não ficarem iguais. */
export function newScene(index: number): TubeScene {
  return {
    emoji: EMOJI_CHOICES[(index * 5) % EMOJI_CHOICES.length],
    text: '',
    background: COLOR_CHIPS[(index + 3) % COLOR_CHIPS.length].value,
    motion: 'pular',
    seconds: 3,
  };
}

/** Lista de cenas da animação: desenho, frase, cor, movimento e tempo de cada uma. */
@Component({
  selector: 'app-scene-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChoiceChips],
  templateUrl: './scene-editor.html',
  styleUrl: '../studio-form.scss',
})
export class SceneEditor {
  readonly scenes = model.required<readonly TubeScene[]>();

  protected readonly emojiChoices = EMOJI_CHOICES;
  protected readonly motionOptions = MOTION_OPTIONS;
  protected readonly colorChips = COLOR_CHIPS;
  protected readonly maxScenes = MAX_SCENES;
  protected readonly maxTextLength = MAX_SCENE_TEXT_LENGTH;
  protected readonly secondChoices = Array.from({ length: MAX_SCENE_SECONDS - MIN_SCENE_SECONDS + 1 }, (_, index) => MIN_SCENE_SECONDS + index);

  protected update(index: number, change: Partial<TubeScene>): void {
    this.scenes.update((scenes) => scenes.map((scene, position) => (position === index ? { ...scene, ...change } : scene)));
  }

  protected setMotion(index: number, motion: string): void {
    this.update(index, { motion: motion as TubeMotion });
  }

  protected add(): void {
    this.scenes.update((scenes) => (scenes.length < MAX_SCENES ? [...scenes, newScene(scenes.length)] : scenes));
  }

  protected remove(index: number): void {
    this.scenes.update((scenes) => (scenes.length > 1 ? scenes.filter((_, position) => position !== index) : scenes));
  }
}
