import { TestBed } from '@angular/core/testing';

import { LanguageService, resolveLanguage } from './language.service';

const STORAGE_KEY = 'pedro-henrique:idioma';

describe('resolveLanguage', () => {
  it('respeita a escolha salva mesmo contra o idioma do navegador', () => {
    expect(resolveLanguage('en-US', 'pt-BR')).toBe('en-US');
    expect(resolveLanguage('pt-BR', 'en-US')).toBe('pt-BR');
  });

  it('herda o inglês do navegador quando ninguém escolheu ainda', () => {
    expect(resolveLanguage(null, 'en-GB')).toBe('en-US');
  });

  it('abre em português para qualquer outro idioma de navegador', () => {
    expect(resolveLanguage(null, 'pt-BR')).toBe('pt-BR');
    expect(resolveLanguage(null, 'es-AR')).toBe('pt-BR');
    expect(resolveLanguage(null, '')).toBe('pt-BR');
  });

  it('ignora um valor estragado no storage', () => {
    expect(resolveLanguage('klingon', 'pt-BR')).toBe('pt-BR');
  });
});

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('começa no idioma guardado no dispositivo', () => {
    localStorage.setItem(STORAGE_KEY, 'en-US');

    expect(TestBed.inject(LanguageService).current()).toBe('en-US');
  });

  it('guarda a escolha ao trocar de idioma', () => {
    const service = TestBed.inject(LanguageService);

    service.select('en-US');

    expect(service.current()).toBe('en-US');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('en-US');
  });
});
