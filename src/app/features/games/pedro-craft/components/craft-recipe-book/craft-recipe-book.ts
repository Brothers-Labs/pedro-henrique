import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { RecipeView } from '../../models/craft-session.model';
import type { ItemIconCache } from '../../presentation/item-icon-cache';
import { CraftSlot } from '../craft-slot/craft-slot';

/**
 * O livro de receitas: tudo o que dá para fazer aqui, com o que cada coisa pede.
 *
 * Fabricar não depende de decorar receita: o que já dá para fazer vem
 * primeiro, com o botão aceso, e um toque fabrica. O que ainda não dá mostra
 * o que falta, para a criança saber o que ir buscar.
 */
@Component({
  selector: 'app-craft-recipe-book',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CraftSlot],
  template: `
    <h3 class="title"><span aria-hidden="true">📖</span> Receitas</h3>
    <ul class="pages">
      @for (recipe of recipes(); track recipe.id) {
        <li class="page" [class.page--locked]="!recipe.canCraft">
          <span class="page__output"><app-craft-slot [slot]="recipe.output" [icons]="icons()" /></span>
          <div class="page__text">
            <p class="page__name">{{ icons().describe(recipe.output) }}</p>
            <p class="page__needs">
              @for (ingredient of recipe.ingredients; track ingredient.item) {
                <span class="need" [class.need--missing]="ingredient.have < ingredient.count">
                  <img class="need__icon" [src]="icons().url(ingredient.item)" alt="" />
                  {{ ingredient.count }} {{ icons().name(ingredient.item) }}
                </span>
              }
            </p>
          </div>
          <button
            type="button"
            class="page__make"
            [disabled]="!recipe.canCraft"
            [attr.aria-label]="'Fazer ' + icons().describe(recipe.output)"
            (click)="crafted.emit(recipe.id)"
          >
            Fazer
          </button>
        </li>
      }
    </ul>
  `,
  styleUrl: './craft-recipe-book.scss',
})
export class CraftRecipeBook {
  readonly recipes = input.required<readonly RecipeView[]>();
  readonly icons = input.required<ItemIconCache>();

  readonly crafted = output<string>();
}
