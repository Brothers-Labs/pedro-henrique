/** Idiomas em que o site sabe mostrar as opções e falar em voz alta. */
export type AppLanguage = 'pt-BR' | 'en-US';

export const DEFAULT_LANGUAGE: AppLanguage = 'pt-BR';

/**
 * Conteúdo escrito uma vez por idioma.
 *
 * Guardar os dois idiomas lado a lado — em vez de duas listas separadas —
 * garante que nenhum cartão exista só em português: o compilador cobra a
 * tradução no momento em que a palavra é criada.
 */
export type Localized<TValue> = Readonly<Record<AppLanguage, TValue>>;

/** Como um idioma se apresenta no seletor: sempre escrito no próprio idioma. */
export interface LanguageOption {
  readonly id: AppLanguage;
  readonly label: string;
  readonly flag: string;
}

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'pt-BR' || value === 'en-US';
}
