import { CraftCatalog } from '../content/craft-catalog';
import { STATIC_CONTENT_BASE_URL } from '../content/craft-content.gateway';
import { parseCraftContent } from '../content/parse-content';
import { CONTENT_FILES, type ContentFile } from '../models/content.model';

/**
 * Conteúdo de verdade para os testes do PedroCraft.
 *
 * Os testes leem os mesmos JSON que o site publica: uma regra de jogo testada
 * com dados inventados poderia passar enquanto o conteúdo real quebra.
 */

export type JsonValue = null | boolean | number | string | JsonValue[] | JsonRecord;

export interface JsonRecord {
  [key: string]: JsonValue;
}

export type ContentFiles = Record<ContentFile, JsonValue>;

let publishedFiles: Promise<ContentFiles> | null = null;

/** Os oito JSON publicados, lidos uma vez por execução de testes. Devolve uma cópia para cada teste poder alterar. */
export async function fetchPublishedContentFiles(): Promise<ContentFiles> {
  publishedFiles ??= Promise.all(
    CONTENT_FILES.map(async (file) => {
      const response = await fetch(`${STATIC_CONTENT_BASE_URL}/${file}.json`);

      if (!response.ok) {
        throw new Error(`O teste não conseguiu ler ${file}.json (${response.status}).`);
      }

      return [file, (await response.json()) as JsonValue] as const;
    }),
  ).then((entries) => Object.fromEntries(entries) as ContentFiles);

  return structuredClone(await publishedFiles);
}

/** Catálogo montado a partir do conteúdo publicado. */
export async function loadTestCatalog(): Promise<CraftCatalog> {
  return new CraftCatalog(parseCraftContent(await fetchPublishedContentFiles()));
}
