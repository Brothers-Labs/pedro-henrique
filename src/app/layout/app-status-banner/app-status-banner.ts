import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AppUpdateService } from '../../core/services/app-update.service';
import { ConnectivityService } from '../../core/services/connectivity.service';

/**
 * Avisos do app instalado: a internet caiu, ou chegou uma versão nova.
 *
 * Fica no fluxo da página, logo abaixo do cabeçalho, em vez de flutuar por
 * cima do conteúdo: nenhum aviso pode cobrir um cartão da prancha de falar.
 */
@Component({
  selector: 'app-status-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-status-banner.html',
  styleUrl: './app-status-banner.scss',
})
export class AppStatusBanner {
  private readonly appUpdate = inject(AppUpdateService);

  protected readonly isOnline = inject(ConnectivityService).isOnline;
  protected readonly isUpdateReady = this.appUpdate.isUpdateReady;

  protected applyUpdate(): void {
    this.appUpdate.applyUpdate();
  }
}
