import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { IqAchievementProgress } from '../../../../core/models/iq-game.model';

/**
 * Painel de conquistas do Desafio da Mente.
 *
 * É um componente só de apresentação: recebe as conquistas já resolvidas e as
 * desenha, tanto no mapa quanto na comemoração final.
 */
@Component({
  selector: 'app-achievement-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './achievement-list.html',
  styleUrl: './achievement-list.scss',
})
export class AchievementList {
  readonly items = input.required<readonly IqAchievementProgress[]>();
}
