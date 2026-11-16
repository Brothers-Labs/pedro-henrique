import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';

import { TubeLogo } from '../../components/tube-logo/tube-logo';

/**
 * A casca do PedroTube: a barra com a marca, a busca e o botão de criar, e
 * embaixo a página da vez (início, vídeo, canal ou estúdio).
 */
@Component({
  selector: 'app-tube-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TubeLogo],
  templateUrl: './tube-shell.html',
  styleUrl: './tube-shell.scss',
})
export class TubeShell {
  private readonly router = inject(Router);

  /** O termo buscado fica na URL do início, para o botão "voltar" funcionar. */
  protected readonly searchTerm = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('busca') ?? '')),
    { initialValue: '' },
  );

  protected search(term: string): void {
    const busca = term.trim();

    void this.router.navigate(['/pedro-tube'], { queryParams: busca ? { busca } : {} });
  }
}
