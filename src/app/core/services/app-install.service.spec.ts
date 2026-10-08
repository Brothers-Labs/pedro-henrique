import { TestBed } from '@angular/core/testing';

import { AnalyticsService } from './analytics.service';
import { AppInstallService } from './app-install.service';

type Outcome = 'accepted' | 'dismissed';

/** O `beforeinstallprompt` do Chrome, com a resposta da pessoa já decidida. */
function createInstallPrompt(outcome: Outcome): Event & { prompt: jasmine.Spy } {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: jasmine.createSpy('prompt').and.resolveTo(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
}

describe('AppInstallService', () => {
  let analytics: jasmine.SpyObj<Pick<AnalyticsService, 'track'>>;

  beforeEach(() => {
    analytics = jasmine.createSpyObj<Pick<AnalyticsService, 'track'>>('AnalyticsService', ['track']);
    TestBed.configureTestingModule({ providers: [{ provide: AnalyticsService, useValue: analytics }] });
  });

  it('só oferece instalar depois que o navegador avisa que pode', () => {
    const service = TestBed.inject(AppInstallService);
    expect(service.canInstall()).toBeFalse();

    const installPrompt = createInstallPrompt('accepted');
    window.dispatchEvent(installPrompt);

    expect(service.canInstall()).toBeTrue();
    // A faixa própria do navegador fica escondida: o convite é o botão do site.
    expect(installPrompt.defaultPrevented).toBeTrue();
  });

  it('abre o convite do navegador e mede a resposta', async () => {
    const service = TestBed.inject(AppInstallService);
    const installPrompt = createInstallPrompt('dismissed');
    window.dispatchEvent(installPrompt);

    const outcome = await service.install();

    expect(installPrompt.prompt).toHaveBeenCalled();
    expect(outcome).toBe('dismissed');
    expect(analytics.track).toHaveBeenCalledWith({
      name: 'app_install_answered',
      properties: { outcome: 'dismissed' },
    });
  });

  it('usa o convite uma vez só', async () => {
    const service = TestBed.inject(AppInstallService);
    window.dispatchEvent(createInstallPrompt('accepted'));

    await service.install();

    expect(service.canInstall()).toBeFalse();
    expect(await service.install()).toBe('unavailable');
  });

  it('esconde o botão e mede quando o app é instalado', () => {
    const service = TestBed.inject(AppInstallService);
    window.dispatchEvent(createInstallPrompt('accepted'));

    window.dispatchEvent(new Event('appinstalled'));

    expect(service.canInstall()).toBeFalse();
    expect(analytics.track).toHaveBeenCalledWith({ name: 'app_installed' });
  });
});
