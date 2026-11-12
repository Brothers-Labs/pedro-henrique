import { TestBed } from '@angular/core/testing';

import type { AuthSession } from '../../../core/models/auth.model';
import { ApiClient, type ApiRequest } from '../../../core/services/api-client.service';
import { AuthService } from '../../../core/services/auth.service';
import { clearStoredSession } from '../../../core/services/auth-session.storage';
import { SEASON } from '../config/season.config';
import type { PremiumPassId } from '../models/economy.model';
import { AventuraStore } from './aventura-store.service';
import { parsePurchasedPasses, SeasonPassPurchases } from './season-pass-purchases.service';

const SIGNED_IN: AuthSession = {
  accessToken: 'token-do-adulto',
  expiresAt: null,
  user: { id: 'adulto', name: 'Adulto', email: 'adulto@exemplo.com' },
};

describe('SeasonPassPurchases', () => {
  let request: jasmine.Spy<(options: ApiRequest) => Promise<unknown>>;
  let applyPurchasedPasses: jasmine.Spy<(purchased: readonly PremiumPassId[]) => boolean>;
  let isApiConfigured: boolean;

  const setUp = (): SeasonPassPurchases => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiClient, useValue: { isConfigured: isApiConfigured, request } },
        {
          provide: AventuraStore,
          useValue: { applyPurchasedPasses, passPriceInCents: (pass: PremiumPassId) => (pass === 'vip' ? 199 : 499) },
        },
      ],
    });

    return TestBed.inject(SeasonPassPurchases);
  };

  const signIn = (): void => {
    spyOn(TestBed.inject(AuthService), 'session').and.returnValue(SIGNED_IN);
  };

  beforeEach(() => {
    clearStoredSession();
    isApiConfigured = true;
    request = jasmine.createSpy('request').and.resolveTo({ passes: ['luxo'] });
    applyPurchasedPasses = jasmine.createSpy('applyPurchasedPasses').and.returnValue(true);
  });

  it('monta o pedido do passe com o preço da tabela e exige a conta de um adulto', () => {
    const order = setUp().order('luxo');

    expect(order.product).toEqual({ type: 'season-pass', id: 'luxo', seasonId: SEASON.id });
    expect(order.amountInCents).toBe(499);
    expect(order.period).toBeNull();
    expect(order.requiresAccount).toBeTrue();
  });

  it('com a conta conectada, busca os passes conferidos e libera no jogo', async () => {
    const purchases = setUp();
    signIn();

    await purchases.sync();

    const options = request.calls.mostRecent().args[0];

    expect(options.method).toBe('GET');
    expect(options.path).toBe(`/payments/season-passes?seasonId=${SEASON.id}`);
    expect(options.accessToken).toBe('token-do-adulto');
    expect(applyPurchasedPasses).toHaveBeenCalledWith(['luxo']);
  });

  it('sem conta ou sem servidor, nem pergunta', async () => {
    await setUp().sync();

    expect(request).not.toHaveBeenCalled();
    expect(applyPurchasedPasses).not.toHaveBeenCalled();
  });

  it('sem servidor configurado, não pergunta mesmo com a conta conectada', async () => {
    isApiConfigured = false;
    const purchases = setUp();
    signIn();

    await purchases.sync();

    expect(request).not.toHaveBeenCalled();
  });

  it('uma falha na busca fica no console e não libera nada', async () => {
    request.and.rejectWith(new Error('fora do ar'));
    const warn = spyOn(console, 'warn');
    const purchases = setUp();
    signIn();

    await expectAsync(purchases.sync()).toBeResolved();

    expect(warn).toHaveBeenCalled();
    expect(applyPurchasedPasses).not.toHaveBeenCalled();
  });

  it('a resposta do servidor só deixa passar passes conhecidos', () => {
    expect(parsePurchasedPasses({ passes: ['vip', 'ouro', 7, 'luxo'] })).toEqual(['vip', 'luxo']);
    expect(() => parsePurchasedPasses({ outra: [] })).toThrowError(/passes/);
    expect(() => parsePurchasedPasses(null)).toThrowError(/passes/);
  });
});
