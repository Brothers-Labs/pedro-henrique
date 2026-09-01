import { buildPhraseText } from './phrase';

describe('buildPhraseText', () => {
  it('devolve texto vazio quando não há cartões', () => {
    expect(buildPhraseText([])).toBe('');
  });

  it('ignora rótulos em branco', () => {
    expect(buildPhraseText(['   ', ''])).toBe('');
  });

  it('junta as palavras e fecha a frase com ponto', () => {
    expect(buildPhraseText(['Eu quero', 'suco'])).toBe('Eu quero suco.');
  });

  it('começa a frase com letra maiúscula', () => {
    expect(buildPhraseText(['água', 'por favor'])).toBe('Água por favor.');
  });

  it('não duplica a pontuação de quem já terminou a frase', () => {
    expect(buildPhraseText(['Cadê a mamãe?'])).toBe('Cadê a mamãe?');
  });

  it('normaliza espaços sobrando nas pontas dos rótulos', () => {
    expect(buildPhraseText([' Eu estou ', ' feliz '])).toBe('Eu estou feliz.');
  });
});
