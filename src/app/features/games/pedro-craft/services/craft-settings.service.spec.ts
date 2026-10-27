import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CalmModeService } from '../../../../core/services/calm-mode.service';
import type { CraftSettings } from '../models/craft-settings.model';
import { CraftSettingsService, sanitize } from './craft-settings.service';

const STORAGE_KEY = 'pedro-henrique:pedro-craft:settings:v1';

const FALLBACK: CraftSettings = {
  peaceful: false,
  lookSensitivity: 1,
  autoJump: true,
  touchControls: 'automatico',
  buttonSize: 'normal',
};

describe('Preferências do PedroCraft', () => {
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  const serviceWithCalmMode = (isCalm: boolean): CraftSettingsService => {
    TestBed.configureTestingModule({ providers: [{ provide: CalmModeService, useValue: { isEnabled: signal(isCalm) } }] });

    return TestBed.inject(CraftSettingsService);
  };

  it('liga o Modo Paz por padrão quando o modo calmo do site está ligado', () => {
    expect(serviceWithCalmMode(true).settings().peaceful).toBeTrue();
  });

  it('deixa o Modo Paz desligado por padrão sem o modo calmo', () => {
    expect(serviceWithCalmMode(false).settings().peaceful).toBeFalse();
  });

  it('respeita a escolha guardada, mesmo com o modo calmo ligado', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...FALLBACK, peaceful: false }));

    expect(serviceWithCalmMode(true).settings().peaceful).toBeFalse();
  });

  it('grava as mudanças no aparelho', () => {
    serviceWithCalmMode(false).update({ autoJump: false });

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual(jasmine.objectContaining({ autoJump: false }));
  });

  it('limita a sensibilidade do olhar à faixa permitida', () => {
    expect(sanitize({ lookSensitivity: 9 }, FALLBACK).lookSensitivity).toBe(2);
    expect(sanitize({ lookSensitivity: 0 }, FALLBACK).lookSensitivity).toBe(0.5);
  });

  it('volta ao valor anterior quando o guardado não faz sentido', () => {
    const result = sanitize({ touchControls: 'as-vezes', buttonSize: 3, peaceful: 'sim' }, FALLBACK);

    expect(result).toEqual(FALLBACK);
  });

  it('ignora preferências que não são um objeto', () => {
    expect(sanitize('quebrado', FALLBACK)).toBe(FALLBACK);
    expect(sanitize(null, FALLBACK)).toBe(FALLBACK);
  });
});
