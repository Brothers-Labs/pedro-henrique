import { TestBed } from '@angular/core/testing';

import { AnalyticsService } from './analytics.service';
import { ConnectivityService } from './connectivity.service';

describe('ConnectivityService', () => {
  let analytics: jasmine.SpyObj<Pick<AnalyticsService, 'track'>>;

  beforeEach(() => {
    analytics = jasmine.createSpyObj<Pick<AnalyticsService, 'track'>>('AnalyticsService', ['track']);
    TestBed.configureTestingModule({ providers: [{ provide: AnalyticsService, useValue: analytics }] });
  });

  it('começa com o estado de conexão do aparelho', () => {
    spyOnProperty(navigator, 'onLine').and.returnValue(false);

    expect(TestBed.inject(ConnectivityService).isOnline()).toBeFalse();
  });

  it('acompanha a queda e a volta da internet', () => {
    const service = TestBed.inject(ConnectivityService);

    window.dispatchEvent(new Event('offline'));
    expect(service.isOnline()).toBeFalse();

    window.dispatchEvent(new Event('online'));
    expect(service.isOnline()).toBeTrue();
  });

  it('conta cada queda de internet', () => {
    TestBed.inject(ConnectivityService);

    window.dispatchEvent(new Event('offline'));

    expect(analytics.track).toHaveBeenCalledOnceWith({ name: 'connection_lost' });
  });
});
