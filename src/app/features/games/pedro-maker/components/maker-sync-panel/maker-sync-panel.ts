import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { LevelSyncService } from '../../sync/level-sync.service';
import type { SyncStatus } from '../../sync/sync.model';

const STATUS_LABELS: Readonly<Record<SyncStatus, { readonly emoji: string; readonly text: string }>> = {
  desligada: { emoji: '📴', text: 'Sincronização desligada neste site' },
  'sem-codigo': { emoji: '🔗', text: 'Este aparelho ainda não está ligado' },
  pronta: { emoji: '✅', text: 'Tudo sincronizado' },
  sincronizando: { emoji: '🔄', text: 'Sincronizando…' },
  offline: { emoji: '📶', text: 'Sem internet — tentamos de novo quando ela voltar' },
  erro: { emoji: '⚠️', text: 'A última sincronização não deu certo' },
};

/** Texto e emoji de cada situação da sincronização, para qualquer tela mostrar igual. */
export function syncStatusLabel(status: SyncStatus): { readonly emoji: string; readonly text: string } {
  return STATUS_LABELS[status];
}

/**
 * Painel para levar as fases criadas a outros aparelhos da família.
 *
 * O primeiro aparelho cria um código; os outros digitam o mesmo código e
 * passam a ver as mesmas fases. É um painel para adulto — a criança nunca
 * precisa mexer aqui para o editor funcionar.
 */
@Component({
  selector: 'app-maker-sync-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  templateUrl: './maker-sync-panel.html',
  styleUrl: './maker-sync-panel.scss',
})
export class MakerSyncPanel {
  private readonly sync = inject(LevelSyncService);

  protected readonly status = this.sync.status;
  protected readonly code = this.sync.code;
  protected readonly pendingCount = this.sync.pendingCount;
  protected readonly lastSyncedAt = this.sync.lastSyncedAt;
  protected readonly errorMessage = this.sync.errorMessage;
  protected readonly label = computed(() => syncStatusLabel(this.status()));
  protected readonly codeError = signal<string | null>(null);
  protected readonly wasCopied = signal(false);

  protected createCode(): void {
    this.sync.connect(this.sync.generateCode());
  }

  protected useCode(input: HTMLInputElement): void {
    if (this.sync.connect(input.value)) {
      this.codeError.set(null);
      input.value = '';
      return;
    }

    this.codeError.set('O código tem de 12 a 64 letras, números ou traços, sem espaços.');
  }

  protected syncNow(): void {
    void this.sync.syncNow();
  }

  protected disconnect(): void {
    if (confirm('Desligar este aparelho? As fases continuam aqui, mas param de ir para os outros aparelhos.')) {
      this.sync.disconnect();
    }
  }

  protected async copyCode(): Promise<void> {
    const code = this.code();

    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      this.wasCopied.set(true);
      setTimeout(() => this.wasCopied.set(false), 2000);
    } catch (error) {
      // Sem permissão de área de transferência: o código continua visível para copiar à mão.
      console.warn('Pedro Maker: não foi possível copiar o código.', error);
    }
  }
}
