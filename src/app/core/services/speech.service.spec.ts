import { findVoice } from './speech.service';

function createVoice(name: string, lang: string, localService: boolean): SpeechSynthesisVoice {
  return { name, lang, localService, default: false, voiceURI: name };
}

const REMOTE_BRAZILIAN = createVoice('Google português do Brasil', 'pt-BR', false);
const LOCAL_BRAZILIAN = createVoice('Microsoft Maria', 'pt-BR', true);
const LOCAL_PORTUGUESE = createVoice('Joana', 'pt_PT', true);
const LOCAL_AMERICAN = createVoice('Samantha', 'en-US', true);

describe('findVoice', () => {
  it('fica com a primeira voz exata do idioma quando há internet', () => {
    expect(findVoice([REMOTE_BRAZILIAN, LOCAL_BRAZILIAN], 'pt-BR', false)).toBe(REMOTE_BRAZILIAN);
  });

  it('prefere uma voz instalada no aparelho quando está sem internet', () => {
    expect(findVoice([REMOTE_BRAZILIAN, LOCAL_BRAZILIAN], 'pt-BR', true)).toBe(LOCAL_BRAZILIAN);
  });

  it('aceita outra variante local da mesma língua antes de uma voz remota', () => {
    expect(findVoice([REMOTE_BRAZILIAN, LOCAL_PORTUGUESE], 'pt-BR', true)).toBe(LOCAL_PORTUGUESE);
  });

  it('tenta a voz remota quando nenhuma voz local fala o idioma', () => {
    expect(findVoice([REMOTE_BRAZILIAN, LOCAL_AMERICAN], 'pt-BR', true)).toBe(REMOTE_BRAZILIAN);
  });

  it('devolve nulo quando nenhuma voz fala o idioma', () => {
    expect(findVoice([LOCAL_AMERICAN], 'pt-BR', true)).toBeNull();
  });
});
