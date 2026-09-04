import { buildPhraseText } from './phrase';

describe('buildPhraseText', () => {
  it('devolve texto vazio quando não há cartões', () => {
    expect(buildPhraseText([], 'pt-BR')).toBe('');
  });

  it('ignora rótulos em branco', () => {
    expect(buildPhraseText(['   ', ''], 'pt-BR')).toBe('');
  });

  it('junta as palavras e fecha a frase com ponto', () => {
    expect(buildPhraseText(['Eu quero', 'suco'], 'pt-BR')).toBe('Eu quero suco.');
  });

  it('começa a frase com letra maiúscula', () => {
    expect(buildPhraseText(['água', 'por favor'], 'pt-BR')).toBe('Água por favor.');
  });

  it('não duplica a pontuação de quem já terminou a frase', () => {
    expect(buildPhraseText(['Cadê a mamãe?'], 'pt-BR')).toBe('Cadê a mamãe?');
  });

  it('normaliza espaços sobrando nas pontas dos rótulos', () => {
    expect(buildPhraseText([' Eu estou ', ' feliz '], 'pt-BR')).toBe('Eu estou feliz.');
  });

  it('monta a frase em inglês com as mesmas regras', () => {
    expect(buildPhraseText(['I want', 'juice'], 'en-US')).toBe('I want juice.');
    expect(buildPhraseText(['water', 'please'], 'en-US')).toBe('Water please.');
  });
});
