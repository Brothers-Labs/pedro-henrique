import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { environment } from '../../../environments/environment';

const SITE_NAME = 'Pedro Henrique';
const DESCRIPTION_KEY = 'description';

/** O ícone do app, e não uma foto: a prévia de link não espalha o rosto de uma criança. */
const SHARE_IMAGE_URL = `${environment.siteUrl}/icons/icon-512.png`;

/**
 * Mantém título, meta description, URL canônica e Open Graph em sincronia com
 * a rota ativa, lendo `title` e `data.description` das definições de rota.
 *
 * Roda também na pré-renderização: é daqui que cada página estática sai com a
 * própria prévia de link e com a URL que o sitemap vai listar.
 */
@Injectable({ providedIn: 'root' })
export class SiteTitleStrategy extends TitleStrategy {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    const fullTitle = pageTitle ? `${pageTitle} · ${SITE_NAME}` : SITE_NAME;
    this.title.setTitle(fullTitle);
    this.meta.updateTag({ property: 'og:title', content: fullTitle });

    const description = this.findDescription(snapshot.root);
    if (description) {
      this.meta.updateTag({ name: 'description', content: description });
      this.meta.updateTag({ property: 'og:description', content: description });
    }

    const canonicalUrl = buildCanonicalUrl(snapshot.url);
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ property: 'og:image', content: SHARE_IMAGE_URL });
    this.updateCanonicalLink(canonicalUrl);
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

  private updateCanonicalLink(href: string): void {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      head.appendChild(link);
    }

    link.href = href;
  }
}

/**
 * Query string e fragmento ficam de fora: são estado da tela (e às vezes um
 * token, como no link de redefinir senha), não uma página diferente.
 */
export function buildCanonicalUrl(routerUrl: string): string {
  const [path] = routerUrl.split(/[?#]/);

  return `${environment.siteUrl}${path || '/'}`;
}
