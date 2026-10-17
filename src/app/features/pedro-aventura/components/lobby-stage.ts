import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  type ElementRef,
  inject,
  input,
  NgZone,
  untracked,
  viewChild,
} from '@angular/core';

import { MotionPreferenceService } from '../../../core/services/motion-preference.service';
import type { LobbySession } from '../engine/launch';
import type { LobbyFraming, LobbyLook } from '../engine/lobby-scene';
import { AventuraStore } from '../services/aventura-store.service';
import { NO_3D_MESSAGE, ScenePresence } from './scene-presence';

/**
 * Palco 3D do lobby e da tela de personagem: o Pedro, o Rex e o carro.
 *
 * Trocar um cosmético troca o modelo na hora, sem recarregar o cenário.
 */
@Component({
  selector: 'app-lobby-stage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #canvasHost class="stage"></div>
    @switch (presence.phase()) {
      @case ('loading') {
        <p class="stage__status" role="status">Carregando o cenário…</p>
      }
      @case ('error') {
        <p class="stage__status" role="alert">{{ noSceneMessage }}</p>
      }
      @case ('context-lost') {
        <p class="stage__status" role="status">A imagem 3D pausou. Ela volta sozinha em instantes.</p>
      }
    }
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      display: block;
    }

    .stage {
      position: absolute;
      inset: 0;
    }

    .stage__status {
      position: absolute;
      inset: auto 1rem 1rem;
      margin: 0;
      color: var(--av-text-soft);
      font-weight: 700;
      text-align: center;
    }
  `,
})
export class LobbyStage {
  readonly framing = input<LobbyFraming>('lobby');
  /** Prévia de um cosmético ainda não equipado (na tela de personagem). */
  readonly look = input<LobbyLook | null>(null);

  private readonly store = inject(AventuraStore);
  private readonly motion = inject(MotionPreferenceService);
  private readonly canvasHost = viewChild.required<ElementRef<HTMLElement>>('canvasHost');

  protected readonly presence = new ScenePresence<LobbySession>(inject(NgZone), inject(DestroyRef));
  protected readonly noSceneMessage = NO_3D_MESSAGE;
  /** Visual que a cena está mostrando, para não remontar o Pedro à toa. */
  private appliedLook: LobbyLook | null = null;

  constructor() {
    afterNextRender(() => void this.start());

    effect(() => {
      const look = this.currentLook();
      // A fase é lida sempre, antes da sessão: assim o efeito volta a rodar quando a cena fica pronta.
      const isReady = this.presence.phase() === 'ready';
      const session = this.presence.current;

      if (session && isReady && !isSameLook(look, this.appliedLook)) {
        this.appliedLook = look;
        untracked(() => session.setLook(look));
      }
    });
  }

  private currentLook(): LobbyLook {
    return this.look() ?? this.store.equipped();
  }

  private async start(): Promise<void> {
    await this.presence.mount(async () => {
      const { launchLobby } = await import('../engine/launch');
      const look = untracked(() => this.currentLook());

      this.appliedLook = look;

      return launchLobby({
        parent: this.canvasHost().nativeElement,
        look,
        framing: this.framing(),
        quality: untracked(() => this.store.settings().quality),
        isMotionAllowed: untracked(() => this.motion.isAllowed()),
        onContextChange: (isLost) => this.presence.setContextLost(isLost),
      });
    });
  }
}

/** Mesmo visual pelos ids: um objeto novo com os mesmos itens não remonta o Pedro. */
function isSameLook(first: LobbyLook, second: LobbyLook | null): boolean {
  return (
    second !== null &&
    first.outfit.id === second.outfit.id &&
    first.dog.id === second.dog.id &&
    first.vehicle.id === second.vehicle.id
  );
}
