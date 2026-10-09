import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppUpdateService } from '../../core/services/app-update.service';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { AppStatusBanner } from './app-status-banner';

describe('AppStatusBanner', () => {
  let fixture: ComponentFixture<AppStatusBanner>;
  let isOnline: WritableSignal<boolean>;
  let isUpdateReady: WritableSignal<boolean>;
  let applyUpdate: jasmine.Spy;

  beforeEach(() => {
    isOnline = signal(true);
    isUpdateReady = signal(false);
    applyUpdate = jasmine.createSpy('applyUpdate');

    TestBed.configureTestingModule({
      imports: [AppStatusBanner],
      providers: [
        { provide: ConnectivityService, useValue: { isOnline: isOnline.asReadonly() } },
        {
          provide: AppUpdateService,
          useValue: { isUpdateReady: isUpdateReady.asReadonly(), applyUpdate },
        },
      ],
    });

    fixture = TestBed.createComponent(AppStatusBanner);
    fixture.detectChanges();
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent?.trim() ?? '';
  }

  it('não mostra nada quando está tudo certo', () => {
    expect(text()).toBe('');
  });

  it('avisa que a prancha continua funcionando quando a internet cai', () => {
    isOnline.set(false);
    fixture.detectChanges();

    expect(text()).toContain('Sem internet agora');
    expect(text()).toContain('prancha de falar');
  });

  it('só atualiza quando alguém toca em Atualizar', () => {
    isUpdateReady.set(true);
    fixture.detectChanges();
    expect(applyUpdate).not.toHaveBeenCalled();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.status__action')?.click();

    expect(applyUpdate).toHaveBeenCalled();
  });
});
