import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { IQ_MAX_AGE, IQ_MIN_AGE } from '../../../core/data/iq-game.data';
import { PROFILE } from '../../../core/data/profile.data';
import type { IqChallenge } from '../../../core/models/iq-game.model';
import { calculateAgeInYears } from '../../../core/utils/birthday';
import { IqGame } from './iq-game';
import { CHALLENGE_ISLANDS } from './iq-game.logic';

const STORAGE_KEY = 'pedro-henrique:iq-journey:v1';

/** Maior exposição de memória do jogo, já com a folga do modo calmo. */
const LONGEST_EXPOSURE_MS = 10000;

describe('IqGame', () => {
  let fixture: ComponentFixture<IqGame>;
  let component: IqGame;
  let element: HTMLElement;

  /** Acesso ao estado interno: o teste dirige a jornada como a tela dirigiria. */
  function stateOf<TValue>(member: string): TValue {
    return (component as unknown as Record<string, () => TValue>)[member]();
  }

  function call(member: string, ...args: readonly number[]): void {
    (component as unknown as Record<string, (...values: readonly number[]) => void>)[member](
      ...args,
    );
    fixture.detectChanges();
  }

  function clickByLabel(label: string): void {
    const button = element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

    if (!button) {
      throw new Error(`Botão "${label}" não encontrado na tela.`);
    }

    button.click();
    fixture.detectChanges();
  }

  function clickByText(text: string): void {
    const button = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) => candidate.textContent?.includes(text),
    );

    if (!button) {
      throw new Error(`Botão "${text}" não encontrado na tela.`);
    }

    button.click();
    fixture.detectChanges();
  }

  function text(): string {
    return element.textContent ?? '';
  }

  function currentChallenge(): IqChallenge {
    const challenge = stateOf<IqChallenge | null>('currentChallenge');

    if (!challenge) {
      throw new Error('Nenhum desafio está em andamento.');
    }

    return challenge;
  }

  /** Responde certo o desafio atual, esperando a memorização quando existe. */
  function answerCorrectly(): void {
    tick(LONGEST_EXPOSURE_MS);
    fixture.detectChanges();
    call('answer', currentChallenge().correctIndex);
  }

  function answerWrongly(): void {
    tick(LONGEST_EXPOSURE_MS);
    fixture.detectChanges();

    const challenge = currentChallenge();
    const total = challenge.format === 'atencao' ? challenge.grid.length : challenge.options.length;
    const wrongIndex = (challenge.correctIndex + 1) % total;

    call('answer', wrongIndex);
  }

  /** Joga a ilha inteira acertando tudo e segue para a próxima etapa. */
  function playIslandCorrectly(): void {
    const total = stateOf<number>('challengesPerIsland');

    for (let challenge = 0; challenge < total; challenge += 1) {
      answerCorrectly();
      call('continueJourney');
    }
  }

  function playWholeJourney(): void {
    for (let island = 0; island < CHALLENGE_ISLANDS.length; island += 1) {
      call('enterIsland');
      playIslandCorrectly();
    }
  }

  beforeEach(async () => {
    localStorage.removeItem(STORAGE_KEY);

    await TestBed.configureTestingModule({ imports: [IqGame] }).compileComponents();

    fixture = TestBed.createComponent(IqGame);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  describe('etapa inicial', () => {
    it('abre convidando a criança pelo nome e pela idade do perfil', () => {
      const profileAge = calculateAgeInYears(PROFILE.birthDate);

      expect(text()).toContain(PROFILE.firstName);
      expect(text()).toContain(`você tem ${profileAge} anos`);
      expect(stateOf<number>('age')).toBe(profileAge);
    });

    it('apresenta a jornada sem falar em teste, QI ou avaliação', () => {
      const opening = text().toLowerCase();

      expect(opening).toContain('desafio da mente');
      expect(opening).toContain('uma aventura para descobrir suas habilidades');
      expect(opening).not.toContain('qi');
      expect(opening).not.toContain('diagnóstico');
    });

    it('muda a idade pelos botões e recalcula a faixa', () => {
      while (stateOf<number>('age') < 10) {
        clickByLabel('Aumentar a idade');
      }

      expect(text()).toContain('Mestre dos Desafios');

      clickByLabel('Diminuir a idade');
      clickByLabel('Diminuir a idade');

      expect(stateOf<number>('age')).toBe(8);
      expect(text()).toContain('Aventureiro');
    });

    it('impede a idade de sair do intervalo aceito', () => {
      for (let step = 0; step < 30; step += 1) {
        clickByLabel('Diminuir a idade');
      }

      expect(stateOf<number>('age')).toBe(IQ_MIN_AGE);
      expect(
        element.querySelector<HTMLButtonElement>('button[aria-label="Diminuir a idade"]')?.disabled,
      ).toBeTrue();

      for (let step = 0; step < 40; step += 1) {
        clickByLabel('Aumentar a idade');
      }

      expect(stateOf<number>('age')).toBe(IQ_MAX_AGE);
      expect(
        element.querySelector<HTMLButtonElement>('button[aria-label="Aumentar a idade"]')?.disabled,
      ).toBeTrue();
    });

    it('começa a dificuldade no nível da faixa escolhida', () => {
      while (stateOf<number>('age') > IQ_MIN_AGE) {
        clickByLabel('Diminuir a idade');
      }

      clickByText('Começar minha aventura');

      expect(stateOf<{ difficulty: number }>('adaptive').difficulty).toBe(1);
    });
  });

  describe('mapa da jornada', () => {
    beforeEach(() => {
      clickByText('Começar minha aventura');
    });

    it('mostra o mapa com a primeira ilha liberada e as outras fechadas', () => {
      const islands = element.querySelectorAll<HTMLButtonElement>('.island');

      expect(islands.length).toBe(8);
      expect(islands[0].dataset['state']).toBe('disponivel');
      expect(islands[1].dataset['state']).toBe('bloqueada');
      expect(islands[1].disabled).toBeTrue();
    });

    it('anuncia o estado de cada etapa em texto, não só pela cor', () => {
      const islands = element.querySelectorAll<HTMLButtonElement>('.island');

      expect(islands[0].textContent).toContain('Liberada');
      expect(islands[1].textContent).toContain('Ainda fechada');
      expect(islands[0].getAttribute('aria-label')).toContain('Ilha dos Padrões e Lógica');
    });

    it('entra na ilha atual e mostra o primeiro desafio', fakeAsync(() => {
      call('enterIsland');

      expect(text()).toContain('Ilha dos Padrões e Lógica');
      expect(text()).toContain(`Desafio 1 de ${stateOf<number>('challengesPerIsland')}`);
      expect(currentChallenge().skill).toBe('logica');
    }));

    it('libera a ilha seguinte só depois de concluir a atual', fakeAsync(() => {
      call('enterIsland');
      playIslandCorrectly();

      const islands = element.querySelectorAll<HTMLButtonElement>('.island');

      expect(islands[0].dataset['state']).toBe('concluida');
      expect(islands[1].dataset['state']).toBe('disponivel');
      expect(islands[2].dataset['state']).toBe('bloqueada');
    }));
  });

  describe('desafios', () => {
    beforeEach(() => {
      clickByText('Começar minha aventura');
    });

    it('comemora o acerto sem falar em erro', fakeAsync(() => {
      call('enterIsland');
      answerCorrectly();

      const feedback = element.querySelector('.feedback');

      expect(feedback?.getAttribute('data-status')).toBe('certo');
      expect(feedback?.textContent).toMatch(/Muito bem|Excelente|Isso mesmo|encontrou o caminho/);
      expect(text()).toContain('XP');
    }));

    it('incentiva no erro, sem tom de fracasso', fakeAsync(() => {
      call('enterIsland');
      answerWrongly();

      const feedback = element.querySelector('.feedback')?.textContent ?? '';

      expect(feedback).toMatch(/Quase lá|Boa tentativa|faz parte da aventura/);
      expect(feedback.toLowerCase()).not.toContain('errou');
      expect(feedback.toLowerCase()).not.toContain('fracasso');
    }));

    it('mostra a resposta certa mesmo quando a criança erra', fakeAsync(() => {
      call('enterIsland');
      answerWrongly();

      const options = element.querySelectorAll<HTMLButtonElement>('.options__button');
      const correct = options[currentChallenge().correctIndex];

      expect(correct.dataset['state']).toBe('certa');
    }));

    it('sobe a dificuldade e avisa depois de dois acertos seguidos', fakeAsync(() => {
      call('enterIsland');

      const startingDifficulty = stateOf<{ difficulty: number }>('adaptive').difficulty;

      answerCorrectly();
      call('continueJourney');
      answerCorrectly();

      expect(stateOf<{ difficulty: number }>('adaptive').difficulty).toBe(startingDifficulty + 1);
      expect(text()).toContain('Novo desafio desbloqueado');
    }));

    it('baixa a dificuldade em silêncio depois de dois erros seguidos', fakeAsync(() => {
      call('enterIsland');

      const startingDifficulty = stateOf<{ difficulty: number }>('adaptive').difficulty;

      answerWrongly();
      call('continueJourney');
      answerWrongly();

      expect(stateOf<{ difficulty: number }>('adaptive').difficulty).toBe(startingDifficulty - 1);
      expect(text()).not.toContain('mais fácil');
      expect(text()).not.toContain('desbloqueado');
    }));

    it('guarda a sequência de acertos e o XP acumulado', fakeAsync(() => {
      call('enterIsland');

      answerCorrectly();
      call('continueJourney');
      answerCorrectly();

      expect(stateOf<number>('streak')).toBe(2);
      expect(stateOf<number>('bestStreak')).toBe(2);
      expect(stateOf<number>('totalXp')).toBeGreaterThan(0);
    }));

    it('zera a sequência ao errar, sem perder o XP já ganho', fakeAsync(() => {
      call('enterIsland');

      answerCorrectly();
      const xpAfterHit = stateOf<number>('totalXp');
      call('continueJourney');
      answerWrongly();

      expect(stateOf<number>('streak')).toBe(0);
      expect(stateOf<number>('bestStreak')).toBe(1);
      expect(stateOf<number>('totalXp')).toBeGreaterThan(xpAfterHit);
    }));

    it('não aceita resposta enquanto a sequência da memória está na tela', fakeAsync(() => {
      // A ilha da memória é a quarta do mapa.
      for (let island = 0; island < 3; island += 1) {
        call('enterIsland');
        playIslandCorrectly();
      }

      call('enterIsland');

      expect(stateOf<string>('challengePhase')).toBe('memorizando');

      call('answer', currentChallenge().correctIndex);

      expect(stateOf<string>('status')).toBe('aguardando');

      tick(LONGEST_EXPOSURE_MS);
      fixture.detectChanges();

      expect(stateOf<string>('challengePhase')).toBe('respondendo');
    }));
  });

  describe('conclusão da jornada', () => {
    beforeEach(() => {
      clickByText('Começar minha aventura');
    });

    it('comemora sem número de QI e mostra o superpoder', fakeAsync(() => {
      playWholeJourney();

      const celebration = text();

      expect(stateOf<string>('phase')).toBe('resultado');
      expect(celebration).toContain(`Parabéns, ${PROFILE.firstName}!`);
      expect(celebration).toContain('Você completou o Desafio da Mente!');
      expect(celebration).toContain('Seu superpoder');
      expect(celebration.toLowerCase()).not.toContain('qi');
      expect(celebration.toLowerCase()).not.toContain('abaixo da média');
    }));

    it('dá estrelas para todas as seis habilidades', fakeAsync(() => {
      playWholeJourney();

      const rows = element.querySelectorAll('.scores__item');

      expect(rows.length).toBe(6);
      for (const row of Array.from(rows)) {
        expect(row.querySelector('.scores__stars')?.getAttribute('aria-label')).toContain(
          'de 5 estrelas',
        );
      }
    }));

    it('abre o baú e desbloqueia as conquistas de fim de jornada', fakeAsync(() => {
      playWholeJourney();

      const reward = element.querySelectorAll<HTMLElement>('.island')[7];
      const unlocked = stateOf<ReadonlySet<string>>('unlockedAchievements');

      expect(reward).toBeUndefined();
      expect(unlocked.has('mestre-da-mente')).toBeTrue();
      expect(unlocked.has('grande-explorador')).toBeTrue();
      expect(unlocked.has('olhos-aguia')).toBeTrue();
      expect(unlocked.has('super-memoria')).toBeTrue();
    }));

    it('guarda a jornada no dispositivo para o histórico dos responsáveis', fakeAsync(() => {
      playWholeJourney();

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();

      const stored: unknown = JSON.parse(raw ?? '{}');
      const state = stored as {
        lifetime: { journeysCompleted: number; totalXp: number };
        history: readonly { completedAt: string; summary: { cognitiveIndex: number } }[];
      };

      expect(state.lifetime.journeysCompleted).toBe(1);
      expect(state.lifetime.totalXp).toBeGreaterThan(0);
      expect(state.history.length).toBe(1);
      expect(state.history[0].summary.cognitiveIndex).toBeGreaterThan(0);
    }));

    it('recomeça uma jornada limpa ao jogar de novo', fakeAsync(() => {
      playWholeJourney();

      clickByText('Jogar de novo');

      expect(stateOf<string>('phase')).toBe('mapa');
      expect(stateOf<number>('totalXp')).toBe(0);
      expect(stateOf<readonly unknown[]>('answers').length).toBe(0);
      expect(element.querySelectorAll<HTMLButtonElement>('.island')[0].dataset['state']).toBe(
        'disponivel',
      );
    }));

    it('não conta a mesma jornada duas vezes no acumulado', fakeAsync(() => {
      playWholeJourney();

      const afterFirst = stateOf<ReadonlySet<string>>('unlockedAchievements').size;
      clickByText('Jogar de novo');

      expect(stateOf<ReadonlySet<string>>('unlockedAchievements').size).toBe(afterFirst);
    }));

    it('volta para a escolha de idade pelo botão de jogos', fakeAsync(() => {
      playWholeJourney();

      clickByText('Voltar aos jogos');

      expect(stateOf<string>('phase')).toBe('inicio');
      expect(text()).toContain('Preparado para começar?');
    }));
  });

  describe('área dos responsáveis', () => {
    it('não oferece o atalho antes de a jornada começar', () => {
      const labels = Array.from(element.querySelectorAll('button')).map(
        (button) => button.textContent ?? '',
      );

      expect(labels.some((label) => label.includes('Área dos responsáveis'))).toBeFalse();
      expect(element.querySelector('.report')).toBeNull();
    });

    it('só monta o relatório quando os responsáveis o abrem', fakeAsync(() => {
      clickByText('Começar minha aventura');

      expect(element.querySelector('.report')).toBeNull();

      call('openGuardianReport');
      expect(element.querySelector('.report')).not.toBeNull();

      call('closeGuardianReport');
      expect(element.querySelector('.report')).toBeNull();
    }));

    it('traz o índice, os indicadores e o aviso educativo', fakeAsync(() => {
      clickByText('Começar minha aventura');
      playWholeJourney();

      call('openGuardianReport');

      const report = element.querySelector('.report')?.textContent ?? '';

      expect(report).toContain('Índice Cognitivo');
      expect(report).toContain(PROFILE.firstName);
      expect(report).toContain('Raciocínio lógico');
      expect(report).toContain('Memória');
      expect(report).toContain('Atenção');
      expect(report).toContain('Não substitui avaliação psicológica ou neuropsicológica');
      expect(element.querySelectorAll('.indicators__item').length).toBe(6);
    }));

    it('mantém o índice dentro da escala de 0 a 100', fakeAsync(() => {
      clickByText('Começar minha aventura');
      playWholeJourney();

      const index = stateOf<{ summary: { cognitiveIndex: number } }>('guardianReport').summary
        .cognitiveIndex;

      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThanOrEqual(100);
    }));
  });
});
