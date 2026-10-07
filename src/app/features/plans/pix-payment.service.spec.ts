import { TestBed } from '@angular/core/testing';

import { ApiClient, type ApiRequest } from '../../core/services/api-client.service';
import { clearStoredSession } from '../../core/services/auth-session.storage';
import { PIX_SETTINGS, PixPaymentService } from './pix-payment.service';

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

  it('envia o comprovante com o valor tirado da tabela de planos', async () => {
    const receipt = new File(['x'], 'comprovante.png', { type: 'image/png' });

    await TestBed.inject(PixPaymentService).submitReceipt({
      planId: 'premium',
      email: ' Ana@Exemplo.com ',
      receipt,
    });

    const options = request.calls.mostRecent().args[0];
    const form = options.body as FormData;

    expect(options.method).toBe('POST');
    expect(options.path).toBe('/payments/pix');
    expect(options.accessToken).toBeUndefined();
    expect(form.get('planId')).toBe('premium');
    expect(form.get('amountInCents')).toBe('2999');
    expect(form.get('email')).toBe('ana@exemplo.com');
    expect((form.get('receipt') as File).name).toBe('comprovante.png');
  });

  it('expõe a chave Pix configurada', () => {
    expect(TestBed.inject(PixPaymentService).settings.key).toBe('pix@exemplo.com');
  });
});
