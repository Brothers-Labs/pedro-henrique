import type { BoardTexts } from '../models/communication.model';
import type { Localized } from '../models/language.model';

/**
 * Todos os textos da prancha, escritos uma vez por idioma.
 *
 * Ficam fora do template porque a página inteira troca de idioma junto com os
 * cartões: deixar as frases soltas no HTML obrigaria a repetir cada bloco duas
 * vezes. Os poucos textos que citam a frase da criança são funções — assim a
 * ordem das palavras fica com quem escreve o idioma, não com o template.
 */
export const BOARD_TEXTS: Localized<BoardTexts> = {
  'pt-BR': {
    title: 'Prancha de falar',
    subtitle: 'Toque nos cartões, monte a sua frase e deixe o computador falar por você.',
    languageLabel: 'Idioma da prancha',
    speechUnsupported:
      'Este navegador não sabe falar em voz alta. Você ainda pode montar e mostrar a sua frase.',
    voiceMissing:
      'Este aparelho ainda não tem uma voz em português instalada. A frase aparece na tela, mas pode sair com sotaque estranho.',
    categoriesLabel: 'Grupos de palavras',
    quickPhrasesTitle: 'Frases rápidas',
    quickPhrasesHint: 'Um toque e o computador fala a frase inteira.',
    savedTitle: 'Frases que eu guardei',
    savedEmpty: 'Monte uma frase e toque em Guardar para ela aparecer aqui.',
    savedFull: 'O caderninho está cheio. Apague uma frase para guardar outra.',
    removeSavedPhrase: (text) => `Apagar a frase ${text}`,
    phraseBar: {
      title: 'A minha frase',
      placeholder: 'Toque nos cartões lá embaixo para montar a sua frase.',
      speak: 'Falar',
      undo: 'Apagar o último',
      clear: 'Limpar',
      save: 'Guardar',
      removeCard: (label) => `Tirar ${label} da frase`,
    },
  },
  'en-US': {
    title: 'Talking board',
    subtitle: 'Tap the cards, build your sentence and let the computer speak for you.',
    languageLabel: 'Board language',
    speechUnsupported:
      'This browser cannot speak out loud. You can still build and show your sentence.',
    voiceMissing:
      'This device does not have an English voice installed yet. The sentence still shows on screen, but it may sound odd.',
    categoriesLabel: 'Word groups',
    quickPhrasesTitle: 'Quick phrases',
    quickPhrasesHint: 'One tap and the computer says the whole sentence.',
    savedTitle: 'Sentences I saved',
    savedEmpty: 'Build a sentence and tap Save to see it here.',
    savedFull: 'The notebook is full. Delete a sentence to save a new one.',
    removeSavedPhrase: (text) => `Delete the sentence ${text}`,
    phraseBar: {
      title: 'My sentence',
      placeholder: 'Tap the cards below to build your sentence.',
      speak: 'Speak',
      undo: 'Undo last',
      clear: 'Clear',
      save: 'Save',
      removeCard: (label) => `Remove ${label} from the sentence`,
    },
  },
};
