import { BoxGeometry, Mesh, MeshBasicMaterial, type Scene } from 'three';

import type { LitFuse } from '../simulation/explosions';

/** O pisca-pisca da TNT acesa: fica mais rápido perto de estourar, como um aviso. */
const SLOW_BLINK_MS = 400;
const FAST_BLINK_MS = 120;
const FAST_BLINK_BELOW_MS = 1200;

/** O brilho branco por cima da TNT: um pouco maior que o bloco, para não piscar junto com a face dele. */
const GLOW_SIZE = 1.02;
const GLOW_OPACITY = 0.6;

/**
 * A TNT acesa piscando em branco.
 *
 * O bloco continua no mundo; por cima dele vai uma caixa branca que acende e
 * apaga. As caixas são reaproveitadas de um quadro para o outro.
 */
export class FusesView {
  private readonly geometry = new BoxGeometry(GLOW_SIZE, GLOW_SIZE, GLOW_SIZE);
  private readonly material = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: GLOW_OPACITY, depthWrite: false });
  private readonly glows: Mesh[] = [];

  constructor(private readonly scene: Scene) {}

  /** `isSteady`: no modo calmo, a TNT acesa brilha parada em vez de piscar. */
  update(fuses: Iterable<LitFuse>, isSteady: boolean): void {
    let used = 0;

    for (const fuse of fuses) {
      const glow = this.glows[used] ?? this.createGlow();
      const blinkMs = fuse.leftMs < FAST_BLINK_BELOW_MS ? FAST_BLINK_MS : SLOW_BLINK_MS;

      glow.position.set(fuse.x + 0.5, fuse.y + 0.5, fuse.z + 0.5);
      glow.visible = isSteady || Math.floor(fuse.leftMs / blinkMs) % 2 === 0;
      used += 1;
    }

    for (let index = used; index < this.glows.length; index += 1) {
      this.glows[index].visible = false;
    }
  }

  dispose(): void {
    for (const glow of this.glows) {
      glow.removeFromParent();
    }

    this.glows.length = 0;
    this.geometry.dispose();
    this.material.dispose();
  }

  private createGlow(): Mesh {
    const glow = new Mesh(this.geometry, this.material);

    this.scene.add(glow);
    this.glows.push(glow);

    return glow;
  }
}
