import { TestBed } from '@angular/core/testing';

import { CalmModeService, parseCalmPreference } from './calm-mode.service';

const STORAGE_KEY = 'pedro-henrique:calm-mode';

describe('parseCalmPreference', () => {
  it('lê a preferência salva', () => {
    expect(parseCalmPreference('on')).toBeTrue();
    expect(parseCalmPreference('off')).toBeFalse();
  });

  it('devolve nulo quando ninguém escolheu ainda', () => {
    expect(parseCalmPreference(null)).toBeNull();
    expect(parseCalmPreference('qualquer-coisa')).toBeNull();
  });
});

describe('CalmModeService', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.removeAttribute('data-calm');
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.removeAttribute('data-calm');
  });

  it('começa desligado quando o sistema não pede menos movimento', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);

    expect(TestBed.inject(CalmModeService).isEnabled()).toBeFalse();
  });

  it('começa ligado quando o sistema pede menos movimento', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);

    expect(TestBed.inject(CalmModeService).isEnabled()).toBeTrue();
  });

  it('respeita a escolha salva mesmo contra a preferência do sistema', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    localStorage.setItem(STORAGE_KEY, 'off');

    expect(TestBed.inject(CalmModeService).isEnabled()).toBeFalse();
  });

  it('marca o documento e guarda a escolha ao ligar', () => {
    const service = TestBed.inject(CalmModeService);

    service.setEnabled(true);
    TestBed.tick();

    expect(document.documentElement.getAttribute('data-calm')).toBe('on');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('on');
  });

  it('limpa a marca do documento ao desligar', () => {
    const service = TestBed.inject(CalmModeService);

    service.setEnabled(true);
    TestBed.tick();
    service.toggle();
    TestBed.tick();

    expect(service.isEnabled()).toBeFalse();
    expect(document.documentElement.hasAttribute('data-calm')).toBeFalse();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('off');
  });
});
