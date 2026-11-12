import { TestBed } from '@angular/core/testing';

import { findPlan } from '../../core/data/plans.data';
import type { AuthSession } from '../../core/models/auth.model';
import { ApiClient, type ApiRequest } from '../../core/services/api-client.service';
import { AuthService } from '../../core/services/auth.service';
import { clearStoredSession } from '../../core/services/auth-session.storage';
import { type PixOrder, planOrder } from './pix-order';
import { PIX_SETTINGS, PixPaymentService } from './pix-payment.service';

const SIGNED_IN: AuthSession = {
  accessToken: 'token-da-ana',
  expiresAt: null,
  user: { id: 'ana', name: 'Ana', email: 'ana@exemplo.com' },
};

describe('PixPaymentService', () => {
  let request: jasmine.Spy<(options: ApiRequest) => Promise<unknown>>;

  beforeEach(() => {
    clearStoredSession();
    request = jasmine.createSpy('request').and.resolveTo(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiClient, useValue: { isConfigured: true, request } },
        { provide: PIX_SETTINGS, useValue: { key: 'pix@exemplo.com', receiverName: 'Família' } },
      ],
    });
  });

  const receipt = new File(['x'], 'comprovante.png', { type: 'image/png' });
  const seasonPassOrder: PixOrder = {
    product: { type: 'season-pass', id: 'vip', seasonId: 'temporada-1' },
    title: 'Passe VIP',
    emoji: '🔷',
    color: 'blue',
    amountInCents: 199,
    period: null,
    releaseNote: 'o passe aparece no jogo.',
    requiresAccount: true,
  };

  it('envia o comprovante do plano com o valor tirado da tabela de planos', async () => {
    await TestBed.inject(PixPaymentService).submitReceipt({
      order: planOrder(findPlan('premium')),
      email: ' Ana@Exemplo.com ',
      receipt,
    });

    const options = request.calls.mostRecent().args[0];
    const form = options.body as FormData;

    expect(options.method).toBe('POST');
    expect(options.path).toBe('/payments/pix');
    expect(options.accessToken).toBeUndefined();
    expect(form.get('productType')).toBe('plan');
    expect(form.get('productId')).toBe('premium');
    expect(form.get('planId')).toBe('premium');
    expect(form.get('seasonId')).toBeNull();
    expect(form.get('amountInCents')).toBe('2999');
    expect(form.get('email')).toBe('ana@exemplo.com');
    expect((form.get('receipt') as File).name).toBe('comprovante.png');
  });

  it('envia o passe da temporada com a temporada e o token da conta, sem planId', async () => {
    spyOn(TestBed.inject(AuthService), 'session').and.returnValue(SIGNED_IN);

    await TestBed.inject(PixPaymentService).submitReceipt({ order: seasonPassOrder, email: 'ana@exemplo.com', receipt });

    const options = request.calls.mostRecent().args[0];
    const form = options.body as FormData;

    expect(options.accessToken).toBe('token-da-ana');
    expect(form.get('productType')).toBe('season-pass');
    expect(form.get('productId')).toBe('vip');
    expect(form.get('seasonId')).toBe('temporada-1');
    expect(form.get('planId')).toBeNull();
    expect(form.get('amountInCents')).toBe('199');
  });

  it('recusa o passe da temporada sem conta conectada, antes de enviar qualquer coisa', async () => {
    await expectAsync(
      TestBed.inject(PixPaymentService).submitReceipt({ order: seasonPassOrder, email: 'ana@exemplo.com', receipt }),
    ).toBeRejectedWithError(/conta conectada/);
    expect(request).not.toHaveBeenCalled();
  });

  it('expõe a chave Pix configurada', () => {
    expect(TestBed.inject(PixPaymentService).settings.key).toBe('pix@exemplo.com');
  });
});
