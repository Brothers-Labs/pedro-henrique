const SENTENCE_END = /[.!?]$/;

/**
 * Junta as palavras dos cartões em uma frase pronta para ser falada.
 *
 * A pontuação final não é enfeite: sem ela o sintetizador de voz lê a frase
 * com entonação de lista, palavra por palavra.
 */
export function buildPhraseText(labels: readonly string[]): string {
  const words = labels.map((label) => label.trim()).filter((label) => label.length > 0);

  if (words.length === 0) {
    return '';
  }

  const sentence = words.join(' ');
  const capitalized = sentence.charAt(0).toLocaleUpperCase('pt-BR') + sentence.slice(1);

  return SENTENCE_END.test(capitalized) ? capitalized : `${capitalized}.`;
}
