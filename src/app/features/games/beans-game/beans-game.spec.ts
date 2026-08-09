import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BeansGame } from './beans-game';

describe('BeansGame', () => {
  let fixture: ComponentFixture<BeansGame>;
  let element: HTMLElement;

  /** Clica na casa informada e processa a renderização seguinte. */
  function clickSpot(position: number): void {
    const spots = element.querySelectorAll<HTMLButtonElement>('.beans__spot');
    spots[position].click();
    fixture.detectChanges();
  }

  function beanAt(position: number): string {
    const spots = element.querySelectorAll<HTMLButtonElement>('.beans__spot');
    return spots[position].textContent?.trim() ?? '';
  }

  function status(): string {
    return element.querySelector('.beans__status')?.textContent?.trim() ?? '';
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BeansGame] }).compileComponents();
    fixture = TestBed.createComponent(BeansGame);
    element = fixture.nativeElement;
    fixture.detectChanges();

    // Modo de dois jogadores: mantém o teste livre de temporizadores.
    const modes = element.querySelectorAll<HTMLButtonElement>('.beans__mode');
    modes[1].click();
    fixture.detectChanges();
  });

  it('desenha as 24 casas do tabuleiro', () => {
    expect(element.querySelectorAll('.beans__spot').length).toBe(24);
  });

  it('coloca os feijões alternando entre os jogadores', () => {
    clickSpot(0);
    clickSpot(3);

    expect(beanAt(0)).toBe('🟤');
    expect(beanAt(3)).toBe('⚪');
  });

  it('pede para comer um feijão quando alguém fecha a trilha', () => {
    clickSpot(0); // marrom
    clickSpot(3); // branco
    clickSpot(1); // marrom
    clickSpot(4); // branco
    clickSpot(2); // marrom fecha a trilha 0-1-2

    expect(status()).toContain('trilha');

    clickSpot(3); // marrom come um feijão branco
    expect(beanAt(3)).toBe('');
    expect(status()).not.toContain('trilha');
  });

  it('ignora o clique em uma casa que já tem feijão', () => {
    clickSpot(0); // marrom ocupa a casa
    clickSpot(0); // branco tenta a mesma casa

    expect(beanAt(0)).toBe('🟤');

    clickSpot(3); // branco continua sendo a vez e ocupa outra casa
    expect(beanAt(3)).toBe('⚪');
  });

  it('deixa os dois lados fecharem trilha e comerem', () => {
    clickSpot(0); // marrom
    clickSpot(3); // branco
    clickSpot(1); // marrom
    clickSpot(4); // branco
    clickSpot(9); // marrom (não fecha trilha)
    clickSpot(5); // branco fecha a trilha 3-4-5

    expect(status()).toContain('trilha');

    clickSpot(9); // branco come o feijão marrom desprotegido
    expect(beanAt(9)).toBe('');
  });

  it('recomeça o jogo com o tabuleiro vazio', () => {
    clickSpot(0);
    clickSpot(3);

    element.querySelector<HTMLButtonElement>('.button--secondary')?.click();
    fixture.detectChanges();

    expect(beanAt(0)).toBe('');
    expect(beanAt(3)).toBe('');
  });
});
