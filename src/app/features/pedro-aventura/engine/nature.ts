import { BufferAttribute, CylinderGeometry, DoubleSide, Group, Mesh, PlaneGeometry, SphereGeometry } from 'three';

import type { MaterialLibrary } from './materials';

const TRUNK_SEGMENTS = 7;
const FRONDS = 9;

/**
 * Folha de palmeira: uma tira comprida que afina na ponta e cai com o peso.
 *
 * É um plano subdividido com os vértices dobrados em código — a curva que um
 * cone nunca teria.
 */
function frondGeometry(length: number, width: number): PlaneGeometry {
  const geometry = new PlaneGeometry(width, length, 4, 10);
  const position = geometry.getAttribute('position') as BufferAttribute;

  for (let index = 0; index < position.count; index += 1) {
    const along = (position.getY(index) + length / 2) / length;
    const taper = Math.sin(Math.PI * Math.min(1, along * 1.15)) * (1 - along * 0.55);

    position.setX(index, position.getX(index) * taper);
    // A folha sai do topo, se afasta e despenca no fim (depois de inclinada, +z vira "para baixo").
    position.setZ(index, along * along * length * 0.6 + Math.abs(position.getX(index)) * 0.25);
    position.setY(index, along * length);
  }

  geometry.computeVertexNormals();

  return geometry;
}

/** Palmeira de tronco curvo em gomos, copa de folhas caídas e cocos. */
export function buildPalm(materials: MaterialLibrary, height: number, lean: number): Group {
  const palm = new Group();
  const bark = materials.standard('#8a6a48', { roughness: 0.95 });
  const barkDark = materials.standard('#6e5236', { roughness: 0.95 });
  const leaf = materials.standard('#2f8a4c', { roughness: 0.7, side: DoubleSide });
  const leafLight = materials.standard('#4bab5f', { roughness: 0.7, side: DoubleSide });
  const coconut = materials.standard('#4a3220', { roughness: 0.8 });
  const segment = height / TRUNK_SEGMENTS;
  let top = new Group();

  palm.add(top);

  for (let index = 0; index < TRUNK_SEGMENTS; index += 1) {
    const radius = 0.2 - index * 0.016;
    const piece = new Mesh(new CylinderGeometry(radius * 0.9, radius, segment * 1.04, 10), index % 2 === 0 ? bark : barkDark);
    const next = new Group();

    piece.position.y = segment / 2;
    piece.castShadow = true;
    next.position.y = segment;
    // Cada gomo entorta um pouco mais: o tronco faz a curva de palmeira de praia.
    next.rotation.z = lean / TRUNK_SEGMENTS;
    top.add(piece, next);
    top = next;
  }

  for (let index = 0; index < FRONDS; index += 1) {
    const frond = new Mesh(frondGeometry(2.3 + (index % 3) * 0.3, 0.55), index % 2 === 0 ? leaf : leafLight);

    // Inclina a folha para fora (de pé ela apontaria para o céu) e espalha em volta do topo.
    frond.rotation.set(1.05 + (index % 3) * 0.12, (index / FRONDS) * Math.PI * 2, 0, 'YXZ');
    frond.castShadow = true;
    top.add(frond);
  }

  for (let index = 0; index < 3; index += 1) {
    const nut = new Mesh(new SphereGeometry(0.09, 10, 8), coconut);
    const angle = (index / 3) * Math.PI * 2;

    nut.position.set(Math.cos(angle) * 0.12, -0.08, Math.sin(angle) * 0.12);
    top.add(nut);
  }

  return palm;
}
