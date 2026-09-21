import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import type { GameEvent } from '../models/game-event.model';

/**
 * Canal único dos eventos da jornada de jogos.
 *
 * É deliberadamente minúsculo: emitir e escutar. Toda a regra de quem reage a
 * quê mora em quem escuta, de modo que acrescentar um novo ouvinte nunca exige
 * tocar em nenhum jogo.
 *
 * Não guarda histórico: quem chega depois não recebe o que já passou. Estado
 * persistente é responsabilidade de cada serviço, não do canal.
 */
@Injectable({ providedIn: 'root' })
export class GameEventBus {
  private readonly stream = new Subject<GameEvent>();

  readonly events: Observable<GameEvent> = this.stream.asObservable();

  emit(event: GameEvent): void {
    this.stream.next(event);
  }
}
