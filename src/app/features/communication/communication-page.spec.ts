import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalyticsService } from '../../core/services/analytics.service';
import { SpeechService } from '../../core/services/speech.service';
import { CommunicationPage } from './communication-page';

const SAVED_PHRASES_KEY = 'pedro-henrique:frases-favoritas';
const LANGUAGE_KEY = 'pedro-henrique:idioma';

type SpeechMock = jasmine.SpyObj<Pick<SpeechService, 'speak' | 'stop' | 'isVoiceMissingFor'>>;

describe('CommunicationPage', () => {
  let fixture: ComponentFixture<CommunicationPage>;
  let element: HTMLElement;
  let speech: SpeechMock;

  /** Toca no cartão da posição informada dentro da categoria visível. */
  function clickCard(position: number): void {
    element.querySelectorAll<HTMLButtonElement>('.board__card')[position].click();
    fixture.detectChanges();
  }

  function clickAction(label: string): void {
    const buttons = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.phrase__actions .button'),
    );
    const button = buttons.find((candidate) => candidate.textContent?.includes(label));

    if (!button) {
      throw new Error(`Botão "${label}" não encontrado na faixa da frase.`);
    }

    button.click();
    fixture.detectChanges();
  }

  function switchLanguage(label: string): void {
    const options = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.language-switch__option'),
    );
    const option = options.find((candidate) => candidate.textContent?.includes(label));

    if (!option) {
      throw new Error(`Idioma "${label}" não encontrado no seletor.`);
    }

    option.click();
    fixture.detectChanges();
  }

  function preview(): string {
    return element.querySelector('.phrase__preview')?.textContent?.trim() ?? '';
  }

  function chips(): readonly string[] {
    return Array.from(element.querySelectorAll('.phrase__chip')).map(
      (chip) => chip.textContent?.trim() ?? '',
    );
  }

  function hasSavedPhrase(text: string): boolean {
    return Array.from(element.querySelectorAll('.board__saved-speak')).some((item) =>
      item.textContent?.includes(text),
    );
  }

  beforeEach(async () => {
    localStorage.removeItem(SAVED_PHRASES_KEY);
    // A prancha abre no idioma do navegador; os testes fixam o português.
    localStorage.setItem(LANGUAGE_KEY, 'pt-BR');

    speech = jasmine.createSpyObj<SpeechMock>('SpeechService', [
      'speak',
      'stop',
      'isVoiceMissingFor',
    ]);
    speech.isVoiceMissingFor.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [CommunicationPage],
      providers: [
        {
          provide: SpeechService,
          useValue: { ...speech, isSupported: true, isSpeaking: signal(false).asReadonly() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunicationPage);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(SAVED_PHRASES_KEY);
    localStorage.removeItem(LANGUAGE_KEY);
  });

  it('começa com a frase vazia e o convite para montá-la', () => {
    expect(chips().length).toBe(0);
    expect(preview()).toBe('');
    expect(element.querySelector('.phrase__placeholder')).not.toBeNull();
  });

  it('fala a palavra e monta a frase a cada cartão tocado', () => {
    clickCard(0);

    expect(speech.speak).toHaveBeenCalledWith('sim', jasmine.objectContaining({ language: 'pt-BR' }));
    expect(chips().length).toBe(1);
    expect(preview()).toBe('Sim.');
  });

  it('troca os cartões ao escolher outra categoria', () => {
    const categories = element.querySelectorAll<HTMLButtonElement>('.board__category');
    categories[1].click();
    fixture.detectChanges();

    const firstCard = element.querySelector('.board__card')?.textContent ?? '';
    expect(firstCard).toContain('Eu quero');
  });

  it('tira da frase o cartão em que a criança toca', () => {
    clickCard(0);
    clickCard(1);
    expect(chips().length).toBe(2);

    element.querySelector<HTMLButtonElement>('.phrase__chip')?.click();
    fixture.detectChanges();

    expect(chips().length).toBe(1);
    expect(preview()).toBe('Não.');
  });

  it('apaga o último cartão e limpa a frase inteira', () => {
    clickCard(0);
    clickCard(1);

    clickAction('Apagar o último');
    expect(preview()).toBe('Sim.');

    clickAction('Limpar');
    expect(chips().length).toBe(0);
    expect(preview()).toBe('');
  });

  it('fala a frase inteira quando o botão Falar é usado', () => {
    clickCard(0);
    speech.speak.calls.reset();

    clickAction('Falar');

    expect(speech.speak).toHaveBeenCalledWith('Sim.', jasmine.objectContaining({ language: 'pt-BR' }));
  });

  it('conta a frase falada pelo tamanho, sem enviar o que foi dito', () => {
    const track = spyOn(TestBed.inject(AnalyticsService), 'track');
    clickCard(0);

    clickAction('Falar');

    expect(track).toHaveBeenCalledOnceWith({
      name: 'phrase_spoken',
      properties: { language: 'pt-BR', source: 'board', wordCount: 1, isOnline: jasmine.any(Boolean) },
    });
    expect(JSON.stringify(track.calls.allArgs())).not.toContain('Sim');
  });

  it('não conta o toque em cada cartão solto', () => {
    const track = spyOn(TestBed.inject(AnalyticsService), 'track');

    clickCard(0);

    expect(track).not.toHaveBeenCalled();
  });

  it('fala a frase pronta com um toque só', () => {
    element.querySelector<HTMLButtonElement>('.board__quick-item')?.click();
    fixture.detectChanges();

    expect(speech.speak).toHaveBeenCalledWith(
      'Eu preciso de ajuda.',
      jasmine.objectContaining({ language: 'pt-BR' }),
    );
  });

  it('guarda a frase montada no caderninho', () => {
    clickCard(0);
    clickAction('Guardar');

    expect(hasSavedPhrase('Sim.')).toBeTrue();
  });

  it('mostra a prancha inteira em inglês ao trocar o idioma', () => {
    switchLanguage('English');

    expect(element.querySelector('.intro__title')?.textContent).toContain('Talking board');
    expect(element.querySelector('.board__card')?.textContent).toContain('yes');
    expect(element.querySelector('.board__quick-item')?.textContent).toContain('I need help.');
  });

  it('fala em inglês depois da troca de idioma', () => {
    switchLanguage('English');
    speech.speak.calls.reset();

    clickCard(0);

    expect(speech.speak).toHaveBeenCalledWith('yes', jasmine.objectContaining({ language: 'en-US' }));
  });

  it('traduz a frase que já estava montada ao trocar de idioma', () => {
    clickCard(0);
    expect(preview()).toBe('Sim.');

    switchLanguage('English');

    expect(preview()).toBe('Yes.');
    expect(chips().length).toBe(1);
  });

  it('separa o caderninho por idioma', () => {
    clickCard(0);
    clickAction('Guardar');

    expect(hasSavedPhrase('Sim.')).toBeTrue();

    switchLanguage('English');

    expect(hasSavedPhrase('Sim.')).toBeFalse();
    expect(hasSavedPhrase('I want water.')).toBeTrue();
  });

  it('lembra o idioma escolhido no dispositivo', () => {
    switchLanguage('English');

    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en-US');
  });
});
