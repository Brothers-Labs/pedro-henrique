import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { EnglishLevel, EnglishLevelId } from '../../../../core/models/english-quiz.model';

/**
 * Cartões de dificuldade do jogo de inglês.
 *
 * É um componente só de apresentação: recebe os níveis e o que está escolhido,
 * e avisa o pai quando a criança troca de nível.
 */
@Component({
  selector: 'app-level-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './level-picker.html',
  styleUrl: './level-picker.scss',
})
export class LevelPicker {
  readonly levels = input.required<readonly EnglishLevel[]>();
  readonly selectedId = input.required<EnglishLevelId>();

  readonly selected = output<EnglishLevelId>();
}
