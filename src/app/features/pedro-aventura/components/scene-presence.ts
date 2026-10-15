import { DestroyRef, NgZone, signal } from '@angular/core';

import type { SceneSession } from '../engine/launch';

export type ScenePhase = 'loading' | 'ready' | 'error' | 'context-lost';

export const NO_3D_MESSAGE = 'Este aparelho não conseguiu abrir o jogo em 3D. Tente atualizar o navegador.';

/**
 * Ciclo de vida de uma cena 3D dentro de um componente.
 *
 * Carrega o motor sob demanda, roda fora da zona do Angular (nenhum quadro
 * dispara detecção de mudanças), pausa quando a aba some, mostra o que
 * aconteceu quando o WebGL cai e libera tudo quando o componente sai.
 */
export class ScenePresence<TSession extends SceneSession> {
  readonly phase = signal<ScenePhase>('loading');
  private session: TSession | null = null;
  private isDestroyed = false;

  constructor(
    private readonly zone: NgZone,
    destroyRef: DestroyRef,
  ) {
    const onVisibility = (): void => {
      if (document.hidden) {
        this.session?.pause();
      } else if (this.phase() === 'ready') {
        this.session?.resume();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    destroyRef.onDestroy(() => {
      this.isDestroyed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      this.session?.destroy();
      this.session = null;
    });
  }

  get current(): TSession | null {
    return this.session;
  }

  async mount(create: () => Promise<TSession>): Promise<void> {
    try {
      const session = await this.zone.runOutsideAngular(create);

      if (this.isDestroyed) {
        session.destroy();
        return;
      }

      this.session = session;
      this.phase.set('ready');
    } catch (error) {
      console.error('Pedro Aventura: a cena 3D não abriu.', error);
      this.phase.set('error');
    }
  }

  /** Chamado pelo motor quando a placa de vídeo cai ou volta. */
  setContextLost(isLost: boolean): void {
    this.zone.run(() => this.phase.set(isLost ? 'context-lost' : 'ready'));

    // Se a aba já voltou enquanto o contexto estava fora, ninguém mais vai pedir para seguir.
    if (!isLost && !document.hidden) {
      this.session?.resume();
    }
  }
}
