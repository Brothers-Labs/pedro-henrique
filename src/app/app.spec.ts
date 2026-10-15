import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { isImmersiveRoute } from './app';

@Component({ template: '' })
class EmptyPage {}

describe('isImmersiveRoute', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'jogos', component: EmptyPage },
          {
            path: 'pedro-aventura',
            data: { immersive: true },
            children: [{ path: 'mapa', component: EmptyPage }],
          },
        ]),
      ],
    });
  });

  it('pede tela cheia nas rotas do jogo, inclusive nas filhas', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);

    await harness.navigateByUrl('/pedro-aventura/mapa');

    expect(isImmersiveRoute(router.routerState.snapshot.root)).toBeTrue();
  });

  it('volta à moldura normal no resto do site', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);

    await harness.navigateByUrl('/pedro-aventura/mapa');
    await harness.navigateByUrl('/jogos');

    expect(isImmersiveRoute(router.routerState.snapshot.root)).toBeFalse();
  });
});
