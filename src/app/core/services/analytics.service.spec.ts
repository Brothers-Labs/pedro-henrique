import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import {
  AnalyticsService,
  buildRouteTemplate,
  gameEventToAnalyticsEvent,
  sanitizeAnalyticsUrl,
} from './analytics.service';

@Component({ template: '' })
class EmptyPage {}

describe('gameEventToAnalyticsEvent', () => {
  it('mede o fim de fase com o jogo, a fase e se foi perfeita', () => {
    expect(
      gameEventToAnalyticsEvent({ type: 'LEVEL_COMPLETED', gameId: 'memoria', level: 3, wasPerfect: true }),
    ).toEqual({
      name: 'game_level_completed',
      properties: { gameId: 'memoria', level: 3, wasPerfect: true },
    });
  });

  it('mede a medalha conquistada', () => {
    expect(
      gameEventToAnalyticsEvent({ type: 'ACHIEVEMENT_UNLOCKED', achievementId: 'primeiro-nivel' }),
    ).toEqual({ name: 'achievement_unlocked', properties: { achievementId: 'primeiro-nivel' } });
  });

  it('deixa de fora cada resposta de desafio', () => {
    expect(
      gameEventToAnalyticsEvent({
        type: 'CHALLENGE_COMPLETED',
        gameId: 'memoria',
        wasCorrect: true,
        streak: 2,
      }),
    ).toBeNull();
  });
});

describe('sanitizeAnalyticsUrl', () => {
  it('remove a query string, que pode carregar um token', () => {
    expect(sanitizeAnalyticsUrl('https://site.dev/redefinir-senha?token=segredo')).toBe(
      'https://site.dev/redefinir-senha',
    );
  });

  it('remove o fragmento', () => {
    expect(sanitizeAnalyticsUrl('https://site.dev/historia#2021')).toBe('https://site.dev/historia');
  });

  it('limpa também um caminho relativo', () => {
    expect(sanitizeAnalyticsUrl('/planos?plano=premium')).toBe('/planos');
  });
});

describe('buildRouteTemplate', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: EmptyPage },
          {
            path: 'jogos/pedro-maker',
            children: [{ path: 'jogar/:levelId', component: EmptyPage }],
          },
          { path: '**', component: EmptyPage },
        ]),
      ],
    });
  });

  async function templateFor(url: string): Promise<string> {
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);

    return buildRouteTemplate(router.routerState.snapshot.root);
  }

  it('agrupa cada fase no molde da rota, e não na URL concreta', async () => {
    expect(await templateFor('/jogos/pedro-maker/jogar/fase-7')).toBe('/jogos/pedro-maker/jogar/:levelId');
  });

  it('descreve a home como a raiz', async () => {
    expect(await templateFor('/')).toBe('/');
  });

  it('junta todas as páginas inexistentes numa só', async () => {
    expect(await templateFor('/nao-existe/mesmo')).toBe('/404');
  });
});

describe('AnalyticsService', () => {
  it('não mede nada fora do build de produção', () => {
    const service = TestBed.inject(AnalyticsService);

    service.start();
    service.track({ name: 'guestbook_message_posted' });

    expect(document.querySelector('script[src*="/_vercel/"]')).toBeNull();
    expect(window.va).toBeUndefined();
  });
});
