import { InjectionToken } from '@angular/core';

import { CONTENT_FILES, type ContentFile, type CraftContent } from '../models/content.model';
import { parseCraftContent, type RawContentFiles } from './parse-content';

/**
 * Porta de entrada do conteúdo do jogo.
 *
 * O jogo não sabe se o conteúdo vem de arquivos estáticos, de um servidor ou
 * de um teste: recebe sempre `CraftContent` já validado e com as referências
 * conferidas.
 */
export interface CraftContentGateway {
  loadContent(): Promise<CraftContent>;
}

/** Onde os JSON de conteúdo ficam publicados junto com o site. */
export const STATIC_CONTENT_BASE_URL = '/data/pedro-craft';

/** Porta em uso. Trocar pelo adaptador do servidor é trocar esta fábrica. */
export const CRAFT_CONTENT_GATEWAY = new InjectionToken<CraftContentGateway>('CRAFT_CONTENT_GATEWAY', {
  providedIn: 'root',
  factory: () => new StaticCraftContentGateway(STATIC_CONTENT_BASE_URL),
});

/**
 * Lê os oito JSON publicados em `public/data/pedro-craft/`.
 *
 * Usa o `fetch` do navegador, sem biblioteca, e busca os arquivos em
 * paralelo. Nada é aceito às cegas: tudo passa por `parseCraftContent`.
 */
export class StaticCraftContentGateway implements CraftContentGateway {
  constructor(private readonly baseUrl: string) {}

  async loadContent(): Promise<CraftContent> {
    const entries = await Promise.all(
      CONTENT_FILES.map(async (file) => [file, await this.fetchFile(file)] as const),
    );

    return parseCraftContent(Object.fromEntries(entries) as RawContentFiles);
  }

  private async fetchFile(file: ContentFile): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/${file}.json`, { headers: { Accept: 'application/json' } });

    if (!response.ok) {
      throw new Error(`PedroCraft: ${file}.json respondeu ${response.status}.`);
    }

    return (await response.json()) as unknown;
  }
}
