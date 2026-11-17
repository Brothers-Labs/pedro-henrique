import { TestBed } from '@angular/core/testing';

import { paletteFor, DEFAULT_LOOK } from '../config/character.config';
import { partnerPalettes, PLAYER_COUNT_OPTIONS } from '../config/players.config';
import { MakerSettingsService } from './maker-settings.service';

const STORAGE_KEY = 'pedro-henrique:pedro-maker:settings:v1';

function freshService(): MakerSettingsService {
  TestBed.resetTestingModule();

  return TestBed.inject(MakerSettingsService);
}

describe('Quantos jogadores no Pedro Maker', () => {
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('começa com uma criança só, o Gui e a Tina esperando a vez de entrar', () => {
    localStorage.removeItem(STORAGE_KEY);

    expect(freshService().settings()).toEqual(jasmine.objectContaining({ players: 1, partnerHero: 'gui', thirdHero: 'tina' }));
  });

  it('ajustes de antes do modo em turma continuam abrindo, com um jogador', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sounds: false, difficulty: 'desafio' }));

    expect(freshService().settings()).toEqual(jasmine.objectContaining({ sounds: false, difficulty: 'desafio', players: 1 }));
  });

  it('guarda 2 ou 3 jogadores e os heróis dos amigos, e recusa valores estranhos', () => {
    freshService().update({ players: 3, partnerHero: 'mario', thirdHero: 'peach' });

    expect(freshService().settings()).toEqual(jasmine.objectContaining({ players: 3, partnerHero: 'mario', thirdHero: 'peach' }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ players: 7, partnerHero: 'bowser', thirdHero: 42 }));

    expect(freshService().settings()).toEqual(jasmine.objectContaining({ players: 1, partnerHero: 'gui', thirdHero: 'tina' }));
  });

  it('tem os mesmos três botões do Pedro Craft: 1, 2 e 3 jogadores', () => {
    expect(PLAYER_COUNT_OPTIONS.map((option) => option.name)).toEqual(['1 jogador', '2 jogadores', '3 jogadores']);
  });

  it('entra na fase só com os amigos da quantidade escolhida, cada um com a roupa do seu herói', () => {
    const pedro = paletteFor(DEFAULT_LOOK, 'pedro');
    const heroes = { partnerHero: 'gui', thirdHero: 'pedro' } as const;

    expect(partnerPalettes(pedro, { players: 1, ...heroes })).toEqual([]);
    expect(partnerPalettes(pedro, { players: 2, ...heroes }).map((palette) => palette.hero)).toEqual(['gui']);
    expect(partnerPalettes(pedro, { players: 3, ...heroes })).toEqual([paletteFor(DEFAULT_LOOK, 'gui'), pedro]);
  });
});
