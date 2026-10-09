import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

import { AnalyticsService } from './analytics.service';
import { AppUpdateService } from './app-update.service';

describe('AppUpdateService', () => {
  let analytics: jasmine.SpyObj<Pick<AnalyticsService, 'track'>>;

  beforeEach(() => {
    analytics = jasmine.createSpyObj<Pick<AnalyticsService, 'track'>>('AnalyticsService', ['track']);
  });

  it('não faz nada quando não há service worker', () => {
    TestBed.configureTestingModule({ providers: [{ provide: AnalyticsService, useValue: analytics }] });

    expect(TestBed.inject(AppUpdateService).isUpdateReady()).toBeFalse();
  });

  it('avisa quando uma versão nova terminou de baixar, sem recarregar sozinho', () => {
    const versionUpdates = new Subject<VersionEvent>();
    TestBed.configureTestingModule({
      providers: [
        { provide: AnalyticsService, useValue: analytics },
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates,
            unrecoverable: new Subject<never>(),
            checkForUpdate: () => Promise.resolve(false),
          },
        },
      ],
    });
    const service = TestBed.inject(AppUpdateService);

    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'nova' } });
    expect(service.isUpdateReady()).toBeFalse();

    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'atual' },
      latestVersion: { hash: 'nova' },
    });
    expect(service.isUpdateReady()).toBeTrue();
  });
});
