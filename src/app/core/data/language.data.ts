import type { LanguageOption } from '../models/language.model';

/**
 * Idiomas oferecidos no seletor, na ordem em que aparecem.
 *
 * O nome de cada idioma fica escrito nele mesmo: quem procura o inglês
 * reconhece "English" mesmo sem ler português.
 */
export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { id: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { id: 'en-US', label: 'English', flag: '🇺🇸' },
];
