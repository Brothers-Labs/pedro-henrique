import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PROFILE } from '../../../../core/data/profile.data';
import type { ThemeColor } from '../../../../core/models/profile.model';

/**
 * Moldura comum das telas de conta: vitrine colorida ao lado do formulário.
 *
 * No celular a vitrine sai de cena e o formulário fica sozinho, logo no topo —
 * ali cada centímetro de altura importa mais do que a decoração.
 */
@Component({
  selector: 'app-auth-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-color]': 'color()' },
  template: `
    <section class="auth container">
      <div class="auth__card">
        <aside class="auth__showcase" aria-hidden="true">
          <span class="auth__sticker auth__sticker--rocket">🚀</span>
          <span class="auth__sticker auth__sticker--star">⭐</span>
          <span class="auth__sticker auth__sticker--palette">🎨</span>
          <span class="auth__sticker auth__sticker--game">🎮</span>

          <span class="auth__portrait">
            <img
              [src]="profile.photo.src"
              [width]="profile.photo.width"
              [height]="profile.photo.height"
              alt=""
              decoding="async"
            />
          </span>
          <p class="auth__showcase-title">Que bom ter você aqui!</p>
          <p class="auth__showcase-text">
            O cantinho do {{ profile.firstName }} na internet, com jogos, desenhos e muitas histórias.
          </p>
        </aside>

        <div class="auth__content">
          <header class="auth__header">
            <span class="auth__emoji" aria-hidden="true">{{ emoji() }}</span>
            <h1 class="auth__title">{{ title() }}</h1>
            <p class="auth__subtitle">{{ subtitle() }}</p>
          </header>

          <ng-content />
        </div>
      </div>
    </section>
  `,
  styleUrl: './auth-shell.scss',
})
export class AuthShell {
  readonly emoji = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly color = input<ThemeColor>('purple');

  protected readonly profile = PROFILE;
}
