import { TestBed } from '@angular/core/testing';

import {
  MAX_SAVED_PHRASES_PER_LANGUAGE,
  parseSavedPhrases,
  PhraseBookService,
} from './phrase-book.service';

const STORAGE_KEY = 'pedro-henrique:frases-favoritas';

describe('parseSavedPhrases', () => {
  it('devolve nulo quando não há nada guardado', () => {
    expect(parseSavedPhrases(null)).toBeNull();
    expect(parseSavedPhrases('')).toBeNull();
  });

  it('devolve nulo quando o conteúdo está estragado', () => {
    expect(parseSavedPhrases('{ isso não é json')).toBeNull();
    expect(parseSavedPhrases('{"frases":[]}')).toBeNull();
  });

  it('assume português nas frases guardadas antes da versão bilíngue', () => {
    const legacy = JSON.stringify([
      { id: 'frase-1', text: 'Eu quero água.', createdAt: '2026-05-10T12:00:00.000Z' },
    ]);

    expect(parseSavedPhrases(legacy)).toEqual([
      {
        id: 'frase-1',
        text: 'Eu quero água.',
        language: 'pt-BR',
        createdAt: '2026-05-10T12:00:00.000Z',
      },
    ]);
  });

  it('descarta entradas sem texto e mantém as válidas', () => {
    const mixed = JSON.stringify([
      { id: 'frase-1', language: 'en-US' },
      { id: 'frase-2', text: 'I want water.', language: 'en-US', createdAt: '2026-05-10T12:00:00.000Z' },
    ]);

    expect(parseSavedPhrases(mixed)?.length).toBe(1);
  });
});

describe('PhraseBookService', () => {
  function createService(): PhraseBookService {
    return TestBed.inject(PhraseBookService);
  }

  beforeEach(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('guarda a frase no idioma em que ela foi montada', () => {
    const service = createService();

    service.save('Eu quero água.', 'pt-BR');
    service.save('I want water.', 'en-US');

    expect(service.listFor('pt-BR').map((phrase) => phrase.text)).toEqual(['Eu quero água.']);
    expect(service.listFor('en-US').map((phrase) => phrase.text)).toEqual(['I want water.']);
  });

  it('não guarda a mesma frase duas vezes no mesmo idioma', () => {
    const service = createService();

    service.save('Eu quero água.', 'pt-BR');
    service.save('eu quero ÁGUA.', 'pt-BR');

    expect(service.listFor('pt-BR').length).toBe(1);
  });

  it('deixa cada idioma com o seu próprio limite', () => {
    const service = createService();

    for (let index = 0; index < MAX_SAVED_PHRASES_PER_LANGUAGE; index += 1) {
      service.save(`Frase ${index}.`, 'pt-BR');
    }

    expect(service.isFullFor('pt-BR')).toBeTrue();
    expect(service.isFullFor('en-US')).toBeFalse();

    service.save('Frase que não cabe.', 'pt-BR');
    expect(service.listFor('pt-BR').length).toBe(MAX_SAVED_PHRASES_PER_LANGUAGE);
  });

  it('apaga a frase escolhida', () => {
    const service = createService();
    service.save('Eu quero água.', 'pt-BR');

    service.remove(service.listFor('pt-BR')[0].id);

    expect(service.listFor('pt-BR').length).toBe(0);
  });
});
