import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CalmModeService } from './calm-mode.service';
import { MotionPreferenceService } from './motion-preference.service';

describe('MotionPreferenceService', () => {
  let isCalmModeEnabled: WritableSignal<boolean>;

  /** Simula a preferência de movimento do sistema operacional. */
  function useSystemPreference(prefersReducedMotion: boolean): void {
    spyOn(window, 'matchMedia').and.returnValue({
      matches: prefersReducedMotion,
      addEventListener: (): void => undefined,
      removeEventListener: (): void => undefined,
    } as unknown as MediaQueryList);
  }

  beforeEach(() => {
    isCalmModeEnabled = signal(false);

    TestBed.configureTestingModule({
      providers: [{ provide: CalmModeService, useValue: { isEnabled: isCalmModeEnabled } }],
    });
  });

  it('permite movimento quando ninguém pediu para reduzir', () => {
    useSystemPreference(false);

    expect(TestBed.inject(MotionPreferenceService).isAllowed()).toBeTrue();
  });

  it('bloqueia movimento quando o sistema pede menos animação', () => {
    useSystemPreference(true);

    expect(TestBed.inject(MotionPreferenceService).isAllowed()).toBeFalse();
  });

  it('bloqueia movimento quando o modo calmo está ligado', () => {
    useSystemPreference(false);
    const service = TestBed.inject(MotionPreferenceService);

    isCalmModeEnabled.set(true);

    expect(service.isAllowed()).toBeFalse();
  });

  it('volta a permitir movimento quando o modo calmo é desligado', () => {
    useSystemPreference(false);
    const service = TestBed.inject(MotionPreferenceService);

    isCalmModeEnabled.set(true);
    isCalmModeEnabled.set(false);

    expect(service.isAllowed()).toBeTrue();
  });
});
