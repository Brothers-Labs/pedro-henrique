import { Color, DoubleSide, FrontSide, MeshBasicMaterial, type Texture } from 'three';

/** Cor da luz das tochas: um amarelo quente, que nunca fica branco estourado. */
const TORCH_COLOR = 'vec3(1.0, 0.86, 0.62)';

/**
 * Luz do dia compartilhada por todos os blocos: a mesma cor escurece o mundo
 * inteiro à noite com uma única troca de valor.
 */
export interface DaylightUniform {
  readonly value: Color;
}

export function createDaylightUniform(): DaylightUniform {
  return { value: new Color(1, 1, 1) };
}

export type VoxelPass = 'opaque' | 'cutout' | 'water';

/**
 * Material dos blocos: sem cálculo de luz em tempo real.
 *
 * A cor final é a textura × a sombra gravada no vértice × a maior entre a luz
 * do dia e a luz da tocha. Um `MeshBasicMaterial` com um trecho de shader a
 * mais faz isso — e continua barato num tablet, porque não depende de quantas
 * luzes existem na cena.
 */
export function createVoxelMaterial(pass: VoxelPass, map: Texture, daylight: DaylightUniform): MeshBasicMaterial {
  const material = new MeshBasicMaterial({
    map,
    vertexColors: true,
    side: pass === 'opaque' ? FrontSide : DoubleSide,
    transparent: pass === 'water',
    opacity: pass === 'water' ? 0.78 : 1,
    depthWrite: pass !== 'water',
    alphaTest: pass === 'cutout' ? 0.5 : 0,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms['daylight'] = daylight;
    shader.vertexShader = `attribute float blockLight;\nvarying float vBlockLight;\n${shader.vertexShader.replace(
      '#include <color_vertex>',
      '#include <color_vertex>\n\tvBlockLight = blockLight;',
    )}`;
    shader.fragmentShader = `uniform vec3 daylight;\nvarying float vBlockLight;\n${shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>\n\tdiffuseColor.rgb *= max(daylight, ${TORCH_COLOR} * vBlockLight);`,
    )}`;
  };
  material.customProgramCacheKey = () => `pedro-craft-voxel-${pass}`;

  return material;
}
