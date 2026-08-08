import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';

const SITE_NAME = 'Pedro Henrique';
const DESCRIPTION_KEY = 'description';

/**
 * Mantém título e meta description em sincronia com a rota ativa, lendo
 * `title` e `data.description` das definições de rota.
 */
@Injectable({ providedIn: 'root' })
export class SiteTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    this.title.setTitle(pageTitle ? `${pageTitle} · ${SITE_NAME}` : SITE_NAME);

    const description = this.findDescription(snapshot.root);
    if (description) {
      this.meta.updateTag({ name: 'description', content: description });
      this.meta.updateTag({ property: 'og:description', content: description });
    }
  }

  private findDescription(route: ActivatedRouteSnapshot): string | null {
    let current: ActivatedRouteSnapshot | null = route;
    let description: string | null = null;

    while (current) {
      const candidate: unknown = current.data[DESCRIPTION_KEY];
      if (typeof candidate === 'string') {
        description = candidate;
      }
      current = current.firstChild;
    }

    return description;
  }
}
