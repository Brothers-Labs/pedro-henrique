import { Color, Mesh, type Object3D, MeshStandardMaterial, type Texture } from 'three';

export interface MaterialOptions {
  readonly emissive?: string;
  readonly emissiveIntensity?: number;
  readonly metalness?: number;
  readonly roughness?: number;
  readonly map?: Texture;
  readonly transparent?: boolean;
  readonly opacity?: number;
}

/**
 * Materiais compartilhados por cor e acabamento.
 *
 * Mil moedas douradas usam um material só: menos troca de estado na placa de
 * vídeo, menos shader compilado e menos memória. Quem cria a cena é dono da
 * biblioteca e a descarta no fim.
 */
export class MaterialLibrary {
  private readonly cache = new Map<string, MeshStandardMaterial>();

  standard(color: string, options: MaterialOptions = {}): MeshStandardMaterial {
    const key = [
      color,
      options.emissive ?? '',
      options.emissiveIntensity ?? 0,
      options.metalness ?? 0.1,
      options.roughness ?? 0.7,
      options.map?.uuid ?? '',
      options.opacity ?? 1,
    ].join('|');

    const cached = this.cache.get(key);

    if (cached) {
      return cached;
    }

    const material = new MeshStandardMaterial({
      color: new Color(color),
      emissive: new Color(options.emissive ?? '#000000'),
      emissiveIntensity: options.emissiveIntensity ?? 0,
      metalness: options.metalness ?? 0.1,
      roughness: options.roughness ?? 0.7,
      map: options.map ?? null,
      transparent: options.transparent ?? (options.opacity ?? 1) < 1,
      opacity: options.opacity ?? 1,
    });

    this.cache.set(key, material);

    return material;
  }

  /** Metal dourado da identidade do jogo. */
  gold(): MeshStandardMaterial {
    return this.standard('#e8b923', { metalness: 0.55, roughness: 0.3, emissive: '#b37a00', emissiveIntensity: 0.55 });
  }

  /** Luz de neon: brilha sozinha, inclusive à noite. */
  neon(color: string, intensity = 1.6): MeshStandardMaterial {
    return this.standard(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
  }

  dispose(): void {
    for (const material of this.cache.values()) {
      material.dispose();
    }

    this.cache.clear();
  }
}

/**
 * Libera as geometrias de um pedaço da cena e o tira dela.
 *
 * Os materiais ficam: são da biblioteca e podem estar em uso por outras peças.
 */
export function disposeGeometries(root: Object3D): void {
  root.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
    }
  });

  root.removeFromParent();
}
